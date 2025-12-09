import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo, SplashScreen, CreditBar } from '@shared/ui';
import { useAuth } from '@features/auth';
import logoImage from '../../../../assets/brand/logo-brianna.png';
import { useMiro, zoomToProject, addStageToProject } from '@features/boards';
import { useMiroBoardSync } from '@features/boards/hooks';
import { miroProjectRowService } from '@features/boards/services/miroSdkService';
import { useProjects, useUpdateProject, useArchiveProject } from '../../hooks';
import { ProjectCard } from '../../components/ProjectCard';
import { createLogger } from '@shared/lib/logger';
import { TIMELINE_COLUMNS, getTimelineStatus, type TimelineStatus } from '@shared/lib/timelineStatus';
import { onProjectChange, broadcastProjectChange } from '@shared/lib/projectBroadcast';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import { projectService } from '../../services/projectService';
import { supabase } from '@shared/lib/supabase';
import { env } from '@shared/config/env';
import { useClientPlanStatsByBoard, useClientTotalAssetsByBoard } from '@features/admin/hooks/useSubscriptionPlans';
import type { ProjectFilters as ProjectFiltersType, Project, ProjectStatus, UpdateProjectInput } from '../../domain/project.types';
import styles from './ProjectsPage.module.css';

// Type for board client info
interface BoardClientInfo {
  companyName: string | null;
  companyLogoUrl: string | null;
  name: string;
  userId?: string;
}

const logger = createLogger('ProjectsPage');

// Icons
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

// Session storage key to track if splash was shown this session
const SPLASH_SHOWN_KEY = 'brianna_splash_shown';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { miro, isInMiro } = useMiro();
  const { syncProject } = useMiroBoardSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<TimelineStatus | ''>('');
  const [boardClient, setBoardClient] = useState<BoardClientInfo | null>(null);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

  // Splash screen state - only show once per session
  const [showSplash, setShowSplash] = useState(() => {
    const wasShown = sessionStorage.getItem(SPLASH_SHOWN_KEY);
    return !wasShown;
  });

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem(SPLASH_SHOWN_KEY, 'true');
  }, []);

  // Fetch client plan stats for the current board
  const { data: clientPlanStats } = useClientPlanStatsByBoard(currentBoardId);

  // Fetch total assets (sum of deliverable counts) for the client
  const { data: totalAssets } = useClientTotalAssetsByBoard(currentBoardId);

  // Fetch client associated with current board
  useEffect(() => {
    async function fetchBoardClient() {
      console.log('[ProjectsPage] fetchBoardClient starting...', { isInMiro, hasMiro: !!miro });

      let boardId: string | null = null;

      // Try to get board ID from Miro SDK
      if (miro) {
        try {
          const boardInfo = await miro.board.getInfo();
          boardId = boardInfo.id;
          console.log('[ProjectsPage] Current board ID from Miro SDK:', boardId);
        } catch (err) {
          console.log('[ProjectsPage] Could not get board ID from Miro SDK:', err);
        }
      }

      try {
        // Save the current board ID for plan stats lookup
        if (boardId) {
          setCurrentBoardId(boardId);
        }

        // Board-based strategies (only if we have a board ID)
        if (boardId) {
          // Strategy 1: Find client whose primaryBoardId matches this board
          console.log('[ProjectsPage] Strategy 1: Looking by primary_board_id...');
          const { data: clientByPrimary, error: error1 } = await supabase
            .from('users')
            .select('id, name, company_name, company_logo_url')
            .eq('role', 'client')
            .eq('primary_board_id', boardId)
            .maybeSingle();

          console.log('[ProjectsPage] Strategy 1 result:', { clientByPrimary, error: error1 });

          if (clientByPrimary) {
            setBoardClient({
              userId: clientByPrimary.id,
              name: clientByPrimary.name,
              companyName: clientByPrimary.company_name,
              companyLogoUrl: clientByPrimary.company_logo_url,
            });
            console.log('[ProjectsPage] Found client by primary_board_id:', clientByPrimary.name);
            return;
          }

          // Strategy 2: Find client via user_boards table (prioritize is_primary)
          console.log('[ProjectsPage] Strategy 2: Looking by user_boards...');
          const { data: userBoards, error: error2 } = await supabase
            .from('user_boards')
            .select('user_id, is_primary')
            .eq('board_id', boardId)
            .order('is_primary', { ascending: false }); // Primary boards first

          console.log('[ProjectsPage] Strategy 2 user_boards:', { userBoards, error: error2 });

          if (userBoards && userBoards.length > 0) {
            // First pass: find primary client with logo
            for (const ub of userBoards) {
              if (!ub.is_primary) continue;
              const { data: clientByUserBoard } = await supabase
                .from('users')
                .select('id, name, company_name, company_logo_url')
                .eq('id', ub.user_id)
                .eq('role', 'client')
                .maybeSingle();

              if (clientByUserBoard && clientByUserBoard.company_logo_url) {
                setBoardClient({
                  userId: clientByUserBoard.id,
                  name: clientByUserBoard.name,
                  companyName: clientByUserBoard.company_name,
                  companyLogoUrl: clientByUserBoard.company_logo_url,
                });
                console.log('[ProjectsPage] Found primary client with logo:', clientByUserBoard.name);
                return;
              }
            }

            // Second pass: find any client with logo
            for (const ub of userBoards) {
              const { data: clientByUserBoard } = await supabase
                .from('users')
                .select('id, name, company_name, company_logo_url')
                .eq('id', ub.user_id)
                .eq('role', 'client')
                .maybeSingle();

              if (clientByUserBoard && clientByUserBoard.company_logo_url) {
                setBoardClient({
                  userId: clientByUserBoard.id,
                  name: clientByUserBoard.name,
                  companyName: clientByUserBoard.company_name,
                  companyLogoUrl: clientByUserBoard.company_logo_url,
                });
                console.log('[ProjectsPage] Found client with logo:', clientByUserBoard.name);
                return;
              }
            }

            // Third pass: find any client (fallback without logo)
            for (const ub of userBoards) {
              const { data: clientByUserBoard } = await supabase
                .from('users')
                .select('id, name, company_name, company_logo_url')
                .eq('id', ub.user_id)
                .eq('role', 'client')
                .maybeSingle();

              if (clientByUserBoard) {
                setBoardClient({
                  userId: clientByUserBoard.id,
                  name: clientByUserBoard.name,
                  companyName: clientByUserBoard.company_name,
                  companyLogoUrl: clientByUserBoard.company_logo_url,
                });
                console.log('[ProjectsPage] Found client by user_boards:', clientByUserBoard.name);
                return;
              }
            }
          }

          // Strategy 3: Find client who has projects on this board (via miro_board_id)
          console.log('[ProjectsPage] Strategy 3: Looking by projects.miro_board_id...');
          const { data: projectsOnBoard, error: error3 } = await supabase
            .from('projects')
            .select('client_id')
            .eq('miro_board_id', boardId)
            .not('client_id', 'is', null);

          console.log('[ProjectsPage] Strategy 3 projects:', { projectsOnBoard, error: error3 });

          if (projectsOnBoard && projectsOnBoard.length > 0) {
            // Get unique client IDs
            const clientIds = [...new Set(projectsOnBoard.map(p => p.client_id).filter(Boolean))];

            for (const clientId of clientIds) {
              const { data: clientByProject } = await supabase
                .from('users')
                .select('id, name, company_name, company_logo_url')
                .eq('id', clientId as string)
                .eq('role', 'client')
                .maybeSingle();

              if (clientByProject) {
                setBoardClient({
                  userId: clientByProject.id,
                  name: clientByProject.name,
                  companyName: clientByProject.company_name,
                  companyLogoUrl: clientByProject.company_logo_url,
                });
                console.log('[ProjectsPage] Found client by project:', clientByProject.name);
                return;
              }
            }
          }
        } else {
          console.log('[ProjectsPage] No board ID available, skipping board-based strategies');
        }

        // Strategy 4: If current user is a client, use their own data
        if (user?.role === 'client') {
          console.log('[ProjectsPage] Strategy 4: Current user is client, checking for company info...');
          const { data: currentClient } = await supabase
            .from('users')
            .select('id, name, company_name, company_logo_url')
            .eq('id', user.id)
            .maybeSingle();

          console.log('[ProjectsPage] Current client data:', currentClient);

          if (currentClient && (currentClient.company_name || currentClient.company_logo_url)) {
            setBoardClient({
              userId: currentClient.id,
              name: currentClient.name,
              companyName: currentClient.company_name,
              companyLogoUrl: currentClient.company_logo_url,
            });
            console.log('[ProjectsPage] Using current client data:', currentClient.name);
            return;
          }
        }

        // No client found for this board
        setBoardClient(null);
        console.log('[ProjectsPage] No client found for board', boardId);
      } catch (err) {
        console.error('[ProjectsPage] Error fetching board client:', err);
      }
    }

    fetchBoardClient();
  }, [miro, user?.id, user?.role]);

  // Get selected project from URL
  const selectedProjectId = searchParams.get('selected');

  // Fetch all non-archived projects
  const filters: ProjectFiltersType = {};
  if (searchQuery) filters.search = searchQuery;

  const { data: projectsData, isLoading, refetch } = useProjects({ filters });

  // Filter projects by timeline status (client-side)
  const allProjects = projectsData?.data || [];
  const projects = useMemo(() => {
    if (!timelineFilter) return allProjects;
    return allProjects.filter(p => getTimelineStatus(p) === timelineFilter);
  }, [allProjects, timelineFilter]);

  const totalProjects = projects.length;

  // Mutations
  const { mutate: updateProject } = useUpdateProject();
  const { mutate: archiveProject } = useArchiveProject();

  // ===== ACTION HANDLERS =====

  // Open board modal (Status action)
  const handleOpenBoardModal = useCallback(async () => {
    if (miro && isInMiro) {
      try {
        await miro.board.ui.openModal({
          url: 'board-modal.html',
          width: 800,  // Wider for 7 columns
          height: 500,
        });
      } catch (error) {
        logger.error('Failed to open board modal', error);
      }
    } else {
      // Fallback for non-Miro environment (development)
      window.open('/board-modal.html', '_blank', 'width=800,height=500');
    }
  }, [miro, isInMiro]);

  // View Board - Zoom to project frames
  const handleViewBoard = useCallback(async (project: Project) => {
    const success = await zoomToProject(project.id);
    if (!success) {
      logger.debug('Project not found on board, may need to sync first');
    }
  }, []);

  // Edit - Navigate to edit page
  const handleEdit = useCallback((project: Project) => {
    navigate(`/projects/${project.id}/edit`);
  }, [navigate]);

  // Update Google Drive URL
  const handleUpdateGoogleDrive = useCallback((projectId: string, googleDriveUrl: string) => {
    updateProject({ id: projectId, input: { googleDriveUrl } });
  }, [updateProject]);

  // Track recently synced projects to avoid duplicate syncs (used by realtime subscription)
  const recentlySyncedRef = useRef<Set<string>>(new Set());

  // Update Status - handles all status changes and Miro sync
  const handleUpdateStatus = useCallback(async (projectId: string, status: ProjectStatus, options?: { markAsReviewed?: boolean }) => {
    logger.debug('Updating project status', { projectId, status, options });

    // Mark as recently synced to prevent realtime subscription from re-syncing
    recentlySyncedRef.current.add(projectId);
    setTimeout(() => recentlySyncedRef.current.delete(projectId), 5000);

    // Build update input - include wasReviewed if client marked as reviewed
    const updateInput: { status: ProjectStatus; wasReviewed?: boolean } = { status };
    if (options?.markAsReviewed) {
      updateInput.wasReviewed = true;
    }
    // Clear wasReviewed when moving back to review status (so client can review again)
    if (status === 'review' && !options?.markAsReviewed) {
      updateInput.wasReviewed = false;
    }

    console.log('[ProjectsPage] handleUpdateStatus called with:', { projectId, status, options });

    updateProject(
      { id: projectId, input: updateInput },
      {
        onSuccess: (updatedProject) => {
          console.log('[ProjectsPage] updateProject onSuccess, updatedProject:', updatedProject.name, updatedProject.status);

          // Sync with Miro board using the response from database
          // Pass markAsReviewed option if client reviewed the project
          syncProject(updatedProject, options).catch(err => {
            logger.error('Miro sync failed', err);
          });

          // Update the status badge in the briefing frame
          console.log('[ProjectsPage] Attempting to update briefing status badge', {
            isInMiro,
            projectId: updatedProject.id,
            projectName: updatedProject.name,
            status: updatedProject.status
          });

          if (isInMiro) {
            console.log('[ProjectsPage] Calling miroProjectRowService.updateBriefingStatus...');
            miroProjectRowService.updateBriefingStatus(
              updatedProject.id,
              updatedProject.status,
              updatedProject.name
            ).then(result => {
              console.log('[ProjectsPage] Briefing status badge update result:', result);
            }).catch(err => {
              console.error('[ProjectsPage] Briefing status badge update failed:', err);
            });
          } else {
            console.log('[ProjectsPage] Not in Miro, skipping briefing status badge update');
          }

          // Broadcast to other contexts
          broadcastProjectChange({
            type: 'PROJECT_UPDATED',
            projectId,
            status,
          });
          logger.info('Project synced to Miro', { name: updatedProject.name, status });
        },
      }
    );
  }, [updateProject, syncProject, isInMiro]);

  // Review - Send for client validation (no extra sync needed, handleUpdateStatus does it)
  const handleReview = useCallback((project: Project) => {
    logger.debug('Project sent for review', { name: project.name });
    // Status update and Miro sync happens via onUpdateStatus callback in ProjectCard
    // No additional sync needed here to avoid duplicates
  }, []);

  // Complete - Finalize project (no extra sync needed, handleUpdateStatus does it)
  const handleComplete = useCallback((project: Project) => {
    logger.debug('Project marked as complete', { name: project.name });
    // Status update and Miro sync happens via onUpdateStatus callback in ProjectCard
    // No additional sync needed here to avoid duplicates
  }, []);

  // Archive - Archive project
  const handleArchive = useCallback((project: Project, reason?: string) => {
    archiveProject(project.id, {
      onSuccess: () => {
        logger.info('Project archived', { name: project.name, reason: reason || 'N/A' });
        refetch();
      },
    });
  }, [archiveProject, refetch]);

  // Create Stage - Add new stage to project board
  const handleCreateStage = useCallback(async (project: Project) => {
    try {
      const stage = await addStageToProject(project.id, project.name);
      if (stage) {
        logger.info('Stage created', { stageNumber: stage.stageNumber, project: project.name });
      } else {
        logger.warn('Could not create stage - project row not found');
      }
    } catch (error) {
      logger.error('Failed to create stage', error);
    }
  }, []);

  // Assign Designer - Update project designers
  const handleAssignDesigner = useCallback((projectId: string, designerIds: string[]) => {
    updateProject(
      { id: projectId, input: { designerIds } },
      {
        onSuccess: (updatedProject) => {
          logger.debug('Designers assigned', { projectId, designerIds });
          // Sync with Miro
          syncProject(updatedProject).catch(err => logger.error('Sync failed', err));
        },
      }
    );
  }, [updateProject, syncProject]);

  // Generic Update - Used for due date requests and other project updates
  const handleUpdate = useCallback((projectId: string, input: UpdateProjectInput) => {
    updateProject(
      { id: projectId, input },
      {
        onSuccess: (updatedProject) => {
          logger.debug('Project updated', { projectId, input });
          // Sync with Miro if there was a status change
          if (input.status || input.dueDate) {
            syncProject(updatedProject).catch(err => logger.error('Sync failed', err));
          }
        },
      }
    );
  }, [updateProject, syncProject]);

  // Scroll to selected project when loaded
  useEffect(() => {
    if (selectedProjectId && !isLoading && projects.length > 0) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const element = document.querySelector(`[data-project-id="${selectedProjectId}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        // Clear the selection from URL after scrolling
        setTimeout(() => {
          setSearchParams({}, { replace: true });
        }, 1500);
      }, 100);
    }
  }, [selectedProjectId, isLoading, projects.length, setSearchParams]);

  // Listen for project changes from other contexts (e.g., BoardModal)
  useEffect(() => {
    const unsubscribe = onProjectChange((message) => {
      logger.debug('Received broadcast', message);
      // Refetch projects when any change is detected
      refetch();
    });

    return () => {
      unsubscribe();
    };
  }, [refetch]);

  // Supabase Realtime subscription for cross-user sync
  // When any user updates a project, all connected clients will sync
  useRealtimeSubscription<{ id: string; status: string; was_reviewed: boolean }>({
    table: 'projects',
    event: 'UPDATE',
    onUpdate: useCallback(async (newRecord, oldRecord) => {
      const projectId = newRecord.id;

      // Skip if we just synced this project (to avoid loops)
      if (recentlySyncedRef.current.has(projectId)) {
        logger.debug('Skipping sync - recently synced', { projectId });
        return;
      }

      logger.info('Realtime: Project updated in database', {
        projectId,
        oldStatus: oldRecord.status,
        newStatus: newRecord.status,
        wasReviewed: newRecord.was_reviewed,
      });

      // Mark as recently synced for 5 seconds
      recentlySyncedRef.current.add(projectId);
      setTimeout(() => recentlySyncedRef.current.delete(projectId), 5000);

      // Refetch the updated project
      refetch();

      // Sync to Miro board if we're in Miro
      if (isInMiro) {
        try {
          // Fetch full project data for Miro sync
          const fullProject = await projectService.getProject(projectId);
          await syncProject(fullProject, { markAsReviewed: fullProject.wasReviewed });
          logger.info('Realtime: Miro sync completed', { projectId, status: fullProject.status });
        } catch (err) {
          logger.error('Realtime: Miro sync failed', err);
        }
      }
    }, [refetch, isInMiro, syncProject]),
    enabled: true,
  });

  // Check if there's a client associated with this board (for personalized header)
  // This works for ANY user viewing the board (admin, designer, client)
  // Show personalized header if we found a client (name is always required)
  const hasClientBranding = boardClient !== null;

  return (
    <div className={styles.container}>
      {/* Splash Screen Animation */}
      {showSplash && (
        <SplashScreen
          staticLogoSrc={logoImage}
          displayDuration={1500}
          animationDuration={600}
          onComplete={handleSplashComplete}
        />
      )}

      {/* Admin Quick Actions Bar - Only for admin users */}
      {user?.role === 'admin' && (
        <div className={styles.adminBar}>
          <div className={styles.adminBarLeft}>
            <button
              className={styles.backButton}
              onClick={() => navigate('/')}
              title="Back to Dashboard"
            >
              <BackIcon />
            </button>
            <span className={styles.adminLabel}>Admin</span>
          </div>
          <div className={styles.adminBarRight}>
            <button
              className={styles.adminButton}
              onClick={handleOpenBoardModal}
              title="Open Project Board"
            >
              <GridIcon />
              <span>Board</span>
            </button>
            <button
              className={styles.adminButton}
              onClick={() => navigate('/admin')}
              title="Admin Settings"
            >
              <SettingsIcon />
              <span>Settings</span>
            </button>
            {user?.avatarUrl && (
              <img
                src={user.avatarUrl}
                alt={user.name || 'User'}
                className={styles.adminAvatar}
              />
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        {hasClientBranding ? (
          // Personalized client header: [Client Logo] [Client Name] | [Brianna Video Logo]
          <>
            <div className={styles.headerLeft}>
              {user?.role !== 'admin' && (
                <button
                  className={styles.backButton}
                  onClick={() => navigate('/')}
                  title="Back to Dashboard"
                >
                  <BackIcon />
                </button>
              )}
              {boardClient.companyLogoUrl ? (
                <img
                  src={boardClient.companyLogoUrl}
                  alt={boardClient.companyName || 'Company'}
                  className={styles.clientLogo}
                />
              ) : (
                <div className={styles.clientLogoPlaceholder}>
                  {(boardClient.companyName || boardClient.name || 'C').charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.headerInfo}>
                <h1 className={styles.brandName}>{boardClient.companyName?.toUpperCase() || boardClient.name?.toUpperCase()}</h1>
                <span className={styles.projectCount}>{totalProjects} projects</span>
              </div>
            </div>
            <div className={styles.headerDivider} />
            <div className={styles.headerRight}>
              <video
                src={env.brand.logoVideoUrl}
                autoPlay
                muted
                playsInline
                className={styles.partnerLogoVideo}
              />
            </div>
          </>
        ) : (
          // Default header for admins/designers or clients without company info
          <>
            <div className={styles.headerLeft}>
              {user?.role !== 'admin' && (
                <button
                  className={styles.backButton}
                  onClick={() => navigate('/')}
                  title="Back to Dashboard"
                >
                  <BackIcon />
                </button>
              )}
              <div className={styles.logo}>
                <Logo size="md" />
              </div>
              <div className={styles.headerInfo}>
                <h1 className={styles.brandName}>BRIANNA DAWES STUDIOS</h1>
                <span className={styles.projectCount}>{totalProjects} projects</span>
              </div>
            </div>
            <div className={styles.headerRight}>
              {user?.role !== 'admin' && user?.avatarUrl && (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'User'}
                  className={styles.avatar}
                />
              )}
            </div>
          </>
        )}
      </header>

      {/* Client Plan Credit Bar */}
      {clientPlanStats && clientPlanStats.planId && (
        <div className={styles.creditBarContainer}>
          <CreditBar
            used={totalAssets ?? 0}
            limit={clientPlanStats.deliverablesLimit}
            planName={clientPlanStats.planName ?? undefined}
            planColor={clientPlanStats.planColor ?? undefined}
            size="sm"
            showLabels
            animate
          />
        </div>
      )}

      {/* Search and Filter */}
      <div className={styles.searchBar}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className={styles.statusSelect}
          value={timelineFilter}
          onChange={(e) => setTimelineFilter(e.target.value as TimelineStatus | '')}
        >
          <option value="">All Status</option>
          {TIMELINE_COLUMNS.map(col => (
            <option key={col.id} value={col.id}>{col.label}</option>
          ))}
        </select>
      </div>

      {/* Project Cards */}
      <div className={styles.projectList}>
        {isLoading ? (
          <div className={styles.loading}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className={styles.empty}>
            <p>No projects found</p>
            {user?.role === 'admin' && (
              <button
                className={styles.createButton}
                onClick={() => navigate('/projects/new')}
              >
                Create your first project
              </button>
            )}
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onEdit={handleEdit}
              onViewBoard={handleViewBoard}
              onUpdateGoogleDrive={handleUpdateGoogleDrive}
              onUpdateStatus={handleUpdateStatus}
              onUpdate={handleUpdate}
              onReview={handleReview}
              onComplete={handleComplete}
              onArchive={handleArchive}
              onCreateStage={handleCreateStage}
              onAssignDesigner={handleAssignDesigner}
              onOpenStatusModal={handleOpenBoardModal}
              isSelected={project.id === selectedProjectId}
            />
          ))
        )}
      </div>
    </div>
  );
}
