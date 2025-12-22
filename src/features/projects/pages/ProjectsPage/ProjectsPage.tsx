import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SplashScreen } from '@shared/ui';
import { useAuth } from '@features/auth';
import logoImage from '../../../../assets/brand/logo-brianna.png';
import { useMiro, zoomToProject, addVersionToProject } from '@features/boards';
import { useMiroBoardSync, useMasterBoardSettings } from '@features/boards/hooks';
import { miroProjectRowService } from '@features/boards/services/miroSdkService';
import { useProjects, useUpdateProject, useArchiveProject, useUnarchiveProject } from '../../hooks';
import { ProjectCard } from '../../components/ProjectCard';
import { createLogger } from '@shared/lib/logger';
import { TIMELINE_COLUMNS, getTimelineStatus, type TimelineStatus } from '@shared/lib/timelineStatus';
import { onProjectChange, broadcastProjectChange } from '@shared/lib/projectBroadcast';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import { projectService } from '../../services/projectService';
import { supabase } from '@shared/lib/supabase';
import { env, SYNC_TIMING, UI_TIMING } from '@shared/config';
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
const EMPTY_PROJECTS: Project[] = [];

// Project types for filtering (matching NewProjectPage)
const PROJECT_TYPES = [
  { value: 'social-post-design', label: 'Social Post Design' },
  { value: 'hero-section', label: 'Hero Section' },
  { value: 'ad-design', label: 'Ad Design' },
  { value: 'gif-design', label: 'GIF Design' },
  { value: 'website-assets', label: 'Website Assets' },
  { value: 'email-design', label: 'Email Design' },
  { value: 'video-production', label: 'Video Production' },
  { value: 'website-ui-design', label: 'Website UI Design' },
  { value: 'marketing-campaign', label: 'Marketing Campaign' },
  { value: 'other', label: 'Other' },
];

// Session storage key to track if splash was shown this session
const SPLASH_SHOWN_KEY = 'brianna_splash_shown';

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { miro, isInMiro } = useMiro();
  const { syncProject } = useMiroBoardSync();
  const { boardId: masterBoardId } = useMasterBoardSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<TimelineStatus | ''>('');
  const [projectTypeFilter, setProjectTypeFilter] = useState<string>('');
  // Initialize selectedClientId from URL param (passed from Dashboard)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(() => {
    return searchParams.get('clientId');
  });
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

  // Fetch client associated with current board
  useEffect(() => {
    async function fetchBoardClient() {
      logger.debug('fetchBoardClient starting', { isInMiro, hasMiro: !!miro });

      let boardId: string | null = null;

      // Try to get board ID from Miro SDK
      if (miro) {
        try {
          const boardInfo = await miro.board.getInfo();
          boardId = boardInfo.id;
          logger.debug('Current board ID from Miro SDK', { boardId });
        } catch (err) {
          logger.warn('Could not get board ID from Miro SDK', err);
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
          logger.debug('Strategy 1: Looking by primary_board_id');
          const { data: clientByPrimary, error: error1 } = await supabase
            .from('users')
            .select('id, name, company_name, company_logo_url')
            .eq('role', 'client')
            .eq('primary_board_id', boardId)
            .maybeSingle();

          logger.debug('Strategy 1 result', { found: !!clientByPrimary, error: error1 });

          if (clientByPrimary) {
            setBoardClient({
              userId: clientByPrimary.id,
              name: clientByPrimary.name,
              companyName: clientByPrimary.company_name,
              companyLogoUrl: clientByPrimary.company_logo_url,
            });
            logger.debug('Found client by primary_board_id', { name: clientByPrimary.name });
            return;
          }

          // Strategy 2: Find client via user_boards table (prioritize is_primary)
          logger.debug('Strategy 2: Looking by user_boards');
          const { data: userBoards, error: error2 } = await supabase
            .from('user_boards')
            .select('user_id, is_primary')
            .eq('board_id', boardId)
            .order('is_primary', { ascending: false }); // Primary boards first

          logger.debug('Strategy 2 user_boards', { count: userBoards?.length ?? 0, error: error2 });

          if (userBoards && userBoards.length > 0) {
            // Batch fetch all users at once (fixes N+1 query problem)
            const userIds = userBoards.map(ub => ub.user_id);
            const { data: clients } = await supabase
              .from('users')
              .select('id, name, company_name, company_logo_url')
              .in('id', userIds)
              .eq('role', 'client');

            if (clients && clients.length > 0) {
              // Create a map for quick lookup
              const clientMap = new Map(clients.map(c => [c.id, c]));

              // Priority 1: Find primary client with logo
              const primaryUserBoards = userBoards.filter(ub => ub.is_primary);
              for (const ub of primaryUserBoards) {
                const client = clientMap.get(ub.user_id);
                if (client && client.company_logo_url) {
                  setBoardClient({
                    userId: client.id,
                    name: client.name,
                    companyName: client.company_name,
                    companyLogoUrl: client.company_logo_url,
                  });
                  logger.debug('Found primary client with logo', { name: client.name });
                  return;
                }
              }

              // Priority 2: Find any client with logo
              const clientWithLogo = clients.find(c => c.company_logo_url);
              if (clientWithLogo) {
                setBoardClient({
                  userId: clientWithLogo.id,
                  name: clientWithLogo.name,
                  companyName: clientWithLogo.company_name,
                  companyLogoUrl: clientWithLogo.company_logo_url,
                });
                logger.debug('Found client with logo', { name: clientWithLogo.name });
                return;
              }

              // Priority 3: Any client (fallback)
              const anyClient = clients[0];
              if (anyClient) {
                setBoardClient({
                  userId: anyClient.id,
                  name: anyClient.name,
                  companyName: anyClient.company_name,
                  companyLogoUrl: anyClient.company_logo_url,
                });
                logger.debug('Found client by user_boards', { name: anyClient.name });
                return;
              }
            }
          }

          // Strategy 3: Find client who has projects on this board (via miro_board_id)
          logger.debug('Strategy 3: Looking by projects.miro_board_id');
          const { data: projectsOnBoard, error: error3 } = await supabase
            .from('projects')
            .select('client_id')
            .eq('miro_board_id', boardId)
            .not('client_id', 'is', null);

          logger.debug('Strategy 3 projects', { count: projectsOnBoard?.length ?? 0, error: error3 });

          if (projectsOnBoard && projectsOnBoard.length > 0) {
            // Get unique client IDs and batch fetch (fixes N+1 query problem)
            const clientIds = [...new Set(projectsOnBoard.map(p => p.client_id).filter(Boolean))] as string[];

            if (clientIds.length > 0) {
              const { data: clientsByProject } = await supabase
                .from('users')
                .select('id, name, company_name, company_logo_url')
                .in('id', clientIds)
                .eq('role', 'client');

              // Prefer client with logo, otherwise take first one
              const clientWithLogo = clientsByProject?.find(c => c.company_logo_url);
              const clientToUse = clientWithLogo || clientsByProject?.[0];

              if (clientToUse) {
                setBoardClient({
                  userId: clientToUse.id,
                  name: clientToUse.name,
                  companyName: clientToUse.company_name,
                  companyLogoUrl: clientToUse.company_logo_url,
                });
                logger.debug('Found client by project', { name: clientToUse.name });
                return;
              }
            }
          }
        } else {
          logger.debug('No board ID available, skipping board-based strategies');
        }

        // Strategy 4: If current user is a client, use their own data
        if (user?.role === 'client') {
          logger.debug('Strategy 4: Current user is client, checking for company info');
          const { data: currentClient } = await supabase
            .from('users')
            .select('id, name, company_name, company_logo_url')
            .eq('id', user.id)
            .maybeSingle();

          logger.debug('Current client data', { hasCompanyInfo: !!(currentClient?.company_name || currentClient?.company_logo_url) });

          if (currentClient && (currentClient.company_name || currentClient.company_logo_url)) {
            setBoardClient({
              userId: currentClient.id,
              name: currentClient.name,
              companyName: currentClient.company_name,
              companyLogoUrl: currentClient.company_logo_url,
            });
            logger.debug('Using current client data', { name: currentClient.name });
            return;
          }
        }

        // No client found for this board
        setBoardClient(null);
        logger.debug('No client found for board', { boardId });
      } catch (err) {
        logger.error('Error fetching board client', err);
      }
    }

    fetchBoardClient();
  }, [miro, isInMiro, user?.id, user?.role]);

  // Get selected project from URL
  const selectedProjectId = searchParams.get('selected');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(() => selectedProjectId);

  useEffect(() => {
    setExpandedProjectId(selectedProjectId);
  }, [selectedProjectId]);

  // Check if we're currently inside the Master Board
  const isMasterBoard = !!(isInMiro && currentBoardId && masterBoardId && currentBoardId === masterBoardId);

  // Query clients for filter dropdown (when on Master Board OR when we have clientId from URL)
  const { data: clientsForFilter } = useQuery<Array<{ id: string; name: string; company_name: string | null }>>({
    queryKey: ['clients-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, company_name')
        .eq('role', 'client')
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; company_name: string | null }>;
    },
    enabled: isMasterBoard || !!selectedClientId,
  });

  // Fetch projects filtered by current board (for data isolation)
  // On Master Board: show all projects (optionally filtered by selected client)
  // On regular boards: filter by board ID
  const filters: ProjectFiltersType = useMemo(() => {
    const f: ProjectFiltersType = {};
    if (searchQuery) f.search = searchQuery;

    // If we have a selectedClientId (from dropdown or URL), filter by it
    // This takes precedence over board filter
    if (selectedClientId) {
      f.clientId = selectedClientId;
    } else if (isMasterBoard) {
      // On Master Board without client selected - show all projects (no filter)
    } else if (isInMiro && currentBoardId) {
      // On regular board - filter by board ID for data isolation
      f.miroBoardId = currentBoardId;
    }
    return f;
  }, [searchQuery, isInMiro, currentBoardId, isMasterBoard, selectedClientId]);

  // Fetch ALL projects (pageSize: 1000 to avoid pagination limits)
  const { data: projectsData, isLoading, refetch } = useProjects({ filters, pageSize: 1000 });

  // Filter projects by timeline status and project type (client-side)
  // Sort priority:
  // - Admin/Creative Director: CLIENT APPROVED first (action needed), then urgency, DONE last
  // - Client: REVIEW first (action needed), then urgency, DONE last
  const allProjects = useMemo(() => projectsData?.data ?? EMPTY_PROJECTS, [projectsData?.data]);
  const projects = useMemo(() => {
    let filtered = allProjects;

    // Filter by timeline status
    if (timelineFilter) {
      filtered = filtered.filter(p => getTimelineStatus(p) === timelineFilter);
    }

    // Filter by project type
    if (projectTypeFilter) {
      filtered = filtered.filter(p => p.briefing?.projectType === projectTypeFilter);
    }

    const isAdmin = user?.role === 'admin';
    const isClient = user?.role === 'client';

    // Priority order: urgent > high > medium > low
    const priorityRank: Record<string, number> = {
      urgent: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    // Status ordering differs by role:
    // - Admin: prioritize "client approved" (review + wasApproved) at the very top so Creative Director sees it immediately
    // - Client: prioritize "review" (needs their action) at the top; approved review is lower because it's already done on their side
    const adminStatusPriority: Record<string, number> = {
      overdue: 1,
      urgent: 2,
      review: 3,
      in_progress: 4,
      done: 5,
    };
    const clientStatusPriority: Record<string, number> = {
      review: 1,
      overdue: 2,
      urgent: 3,
      in_progress: 4,
      done: 5,
    };
    return [...filtered].sort((a, b) => {
      const aTimelineStatus = getTimelineStatus(a);
      const bTimelineStatus = getTimelineStatus(b);

      // Creative Director priority: "Client Approved" should bubble to the very top
      // (review status + wasApproved indicates client has approved and admin should finalize)
      if (isAdmin) {
        const aClientApproved = aTimelineStatus === 'review' && a.wasApproved;
        const bClientApproved = bTimelineStatus === 'review' && b.wasApproved;
        if (aClientApproved !== bClientApproved) return aClientApproved ? -1 : 1;
      }

      // Client view: de-prioritize already-approved review items vs review items needing action
      if (isClient) {
        const aNeedsClientReview = aTimelineStatus === 'review' && !a.wasApproved;
        const bNeedsClientReview = bTimelineStatus === 'review' && !b.wasApproved;
        if (aNeedsClientReview !== bNeedsClientReview) return aNeedsClientReview ? -1 : 1;
      }

      const statusPriority = isClient ? clientStatusPriority : adminStatusPriority;
      const aStatusRank = statusPriority[aTimelineStatus] ?? 4;
      const bStatusRank = statusPriority[bTimelineStatus] ?? 4;
      if (aStatusRank !== bStatusRank) return aStatusRank - bStatusRank;

      const aPriorityRank = priorityRank[a.priority] ?? 3;
      const bPriorityRank = priorityRank[b.priority] ?? 3;
      if (aPriorityRank !== bPriorityRank) return aPriorityRank - bPriorityRank;

      // If both have due dates, sort soonest first
      if (a.dueDate && b.dueDate) {
        const aDue = new Date(a.dueDate).getTime();
        const bDue = new Date(b.dueDate).getTime();
        if (!Number.isNaN(aDue) && !Number.isNaN(bDue) && aDue !== bDue) {
          return aDue - bDue;
        }
      }

      // Otherwise sort by updatedAt (most recent first)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [allProjects, timelineFilter, projectTypeFilter, user?.role]);

  const totalProjects = projects.length;

  // Mutations
  const updateProjectMutation = useUpdateProject();
  const { mutate: updateProject, mutateAsync: updateProjectAsync } = updateProjectMutation;
  const { mutate: archiveProject } = useArchiveProject();
  const { mutate: unarchiveProject } = useUnarchiveProject();

  // ===== ACTION HANDLERS =====

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
  const handleUpdateGoogleDrive = useCallback(async (projectId: string, googleDriveUrl: string) => {
    const trimmed = googleDriveUrl.trim();
    const updated = await updateProjectAsync({ id: projectId, input: { googleDriveUrl: trimmed } });

    if (!updated.googleDriveUrl) {
      throw new Error('Google Drive link was not saved (missing on updated project)');
    }
  }, [updateProjectAsync]);

  // Track recently synced projects to avoid duplicate syncs (used by realtime subscription)
  const recentlySyncedRef = useRef<Set<string>>(new Set());

  // Update Status - handles all status changes and Miro sync
  const handleUpdateStatus = useCallback(async (projectId: string, status: ProjectStatus, options?: { markAsReviewed?: boolean }) => {
    logger.debug('Updating project status', { projectId, status, options });

    // Mark as recently synced to prevent realtime subscription from re-syncing
    recentlySyncedRef.current.add(projectId);
    setTimeout(() => recentlySyncedRef.current.delete(projectId), SYNC_TIMING.RECENT_SYNC_COOLDOWN);

    // Build update input - include wasReviewed if client requested changes
    const updateInput: { status: ProjectStatus; wasReviewed?: boolean; wasApproved?: boolean } = { status };
    if (options?.markAsReviewed) {
      updateInput.wasReviewed = true;
    }

    // Clear flags when status changes:
    // - wasReviewed: cleared when moving to review (so client can review again)
    // - wasApproved: cleared when moving away from done or when sending back to review
    if (status === 'review') {
      // Sending for review - clear both flags so client can review fresh
      updateInput.wasReviewed = false;
      updateInput.wasApproved = false;
    } else if (status === 'done') {
      // Moving to done - clear wasApproved as it's now finalized
      updateInput.wasApproved = false;
    } else if (!options?.markAsReviewed) {
      // Any other status change without explicit markAsReviewed - clear wasReviewed
      updateInput.wasReviewed = false;
    }

    logger.debug('handleUpdateStatus called', { projectId, status, options });

    updateProject(
      { id: projectId, input: updateInput },
      {
        onSuccess: (updatedProject) => {
          logger.debug('updateProject onSuccess', { name: updatedProject.name, status: updatedProject.status });

          // Sync with Miro board using the response from database
          // Pass markAsReviewed option if client reviewed the project
          syncProject(updatedProject, options).catch(err => {
            logger.error('Miro sync failed', err);
          });

          // Update the status badge in the briefing frame
          logger.debug('Attempting to update briefing status badge', {
            isInMiro,
            projectId: updatedProject.id,
            projectName: updatedProject.name,
            status: updatedProject.status
          });

          if (isInMiro) {
            logger.debug('Calling miroProjectRowService.updateBriefingStatus');
            miroProjectRowService.updateBriefingStatus(
              updatedProject.id,
              updatedProject.status,
              updatedProject.name
            ).then(result => {
              logger.debug('Briefing status badge update result', { success: result });
            }).catch(err => {
              logger.error('Briefing status badge update failed', err);
            });
          } else {
            logger.debug('Not in Miro, skipping briefing status badge update');
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

  // Unarchive - Restore archived project
  const handleUnarchive = useCallback((project: Project) => {
    unarchiveProject({ id: project.id, newStatus: 'in_progress' }, {
      onSuccess: (restoredProject) => {
        logger.info('Project restored', { name: restoredProject.name });
        refetch();
        // Sync with Miro to remove done overlay
        syncProject(restoredProject).catch(err => logger.error('Sync failed', err));
      },
    });
  }, [unarchiveProject, refetch, syncProject]);

  // Create Version - Add new version to project board
  const handleCreateVersion = useCallback(async (project: Project) => {
    try {
      const version = await addVersionToProject(project.id, project.name);
      if (version) {
        logger.info('Version created', { versionNumber: version.versionNumber, project: project.name });
      } else {
        logger.warn('Could not create version - project row not found');
      }
    } catch (error) {
      logger.error('Failed to create version', error);
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
          // Sync with Miro if there was a status, approval, review, or due date change
          // wasApproved: client approved the project (shows ✓ icon on card)
          // wasReviewed: client requested changes (shows 🔄 icon on card)
          if (input.status || input.dueDate || input.wasApproved !== undefined || input.wasReviewed !== undefined) {
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
        }, UI_TIMING.URL_CLEAR_DELAY);
      }, UI_TIMING.SCROLL_DELAY);
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

      // Skip if status didn't actually change (avoid unnecessary syncs)
      if (newRecord.status === oldRecord.status && newRecord.was_reviewed === oldRecord.was_reviewed) {
        logger.debug('Skipping sync - no status change', { projectId });
        refetch(); // Still refetch to update UI
        return;
      }

      logger.info('Realtime: Project updated in database', {
        projectId,
        oldStatus: oldRecord.status,
        newStatus: newRecord.status,
        wasReviewed: newRecord.was_reviewed,
      });

      // Mark as recently synced to prevent duplicate syncs
      recentlySyncedRef.current.add(projectId);
      setTimeout(() => recentlySyncedRef.current.delete(projectId), SYNC_TIMING.RECENT_SYNC_COOLDOWN);

      // Refetch the updated project
      refetch();

      // Sync to Miro board if we're in Miro (only for projects on this board)
      if (isInMiro) {
        try {
          // Fetch full project data for Miro sync
          const fullProject = await projectService.getProject(projectId);

          // IMPORTANT: Only sync projects that belong to this board
          if (currentBoardId && fullProject.miroBoardId !== currentBoardId) {
            logger.debug('Skipping Miro sync - project belongs to different board', {
              projectId,
              projectBoardId: fullProject.miroBoardId,
              currentBoardId,
            });
            return;
          }

          await syncProject(fullProject, { markAsReviewed: fullProject.wasReviewed });
          logger.info('Realtime: Miro sync completed', { projectId, status: fullProject.status });
        } catch (err) {
          logger.error('Realtime: Miro sync failed', err);
        }
      }
    }, [refetch, isInMiro, syncProject, currentBoardId]),
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

      {/* Header */}
      <header className={styles.header}>
        {hasClientBranding ? (
          // Personalized client header: [Client Logo] [Client Name] | [Brianna Video Logo]
          <>
            <div className={styles.headerLeft}>
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
          <div className={styles.headerLeft}>
            <div className={styles.headerInfo}>
              <h1 className={styles.brandName}>Projects</h1>
              <span className={styles.projectCount}>{totalProjects} projects</span>
            </div>
          </div>
        )}
      </header>

      {/* Master Board Badge - show when on Master Board OR when filtering by client */}
      {(isMasterBoard || selectedClientId) && (
        <div className={styles.masterBoardBadge}>
          {selectedClientId
            ? `Viewing: ${clientsForFilter?.find(c => c.id === selectedClientId)?.company_name || clientsForFilter?.find(c => c.id === selectedClientId)?.name || 'Client'}`
            : 'Master Board - All Clients'
          }
        </div>
      )}

      {/* Client Filter (on Master Board OR when filtering by client) */}
      {(isMasterBoard || selectedClientId) && clientsForFilter && clientsForFilter.length > 0 && (
        <div className={styles.clientFilterRow}>
          <select
            className={styles.clientSelect}
            value={selectedClientId || ''}
            onChange={(e) => setSelectedClientId(e.target.value || null)}
          >
            <option value="">All Clients</option>
            {clientsForFilter.map(client => (
              <option key={client.id} value={client.id}>
                {client.company_name || client.name}
              </option>
            ))}
          </select>
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
        <select
          className={styles.statusSelect}
          value={projectTypeFilter}
          onChange={(e) => setProjectTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          {PROJECT_TYPES.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
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
              onCardClick={handleViewBoard}
              onUpdateGoogleDrive={handleUpdateGoogleDrive}
              onUpdateStatus={handleUpdateStatus}
              onUpdate={handleUpdate}
              onReview={handleReview}
              onComplete={handleComplete}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              onCreateVersion={handleCreateVersion}
              onAssignDesigner={handleAssignDesigner}
              isSelected={project.id === selectedProjectId}
              isExpanded={project.id === expandedProjectId}
              onExpandedChange={(projectId, expanded) => {
                setExpandedProjectId(expanded ? projectId : null);
              }}
            />
          ))
        )}
      </div>

    </div>
  );
}
