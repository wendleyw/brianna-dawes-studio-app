import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '@shared/ui';
import { useAuth } from '@features/auth';
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
import type { ProjectFilters as ProjectFiltersType, Project, ProjectStatus } from '../../domain/project.types';
import styles from './ProjectsPage.module.css';

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

export function ProjectsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { miro, isInMiro } = useMiro();
  const { syncProject } = useMiroBoardSync();
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<TimelineStatus | ''>('');

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

    updateProject(
      { id: projectId, input: updateInput },
      {
        onSuccess: (updatedProject) => {
          // Sync with Miro board using the response from database
          // Pass markAsReviewed option if client reviewed the project
          syncProject(updatedProject, options).catch(err => {
            logger.error('Miro sync failed', err);
          });

          // Update the status badge in the briefing frame
          logger.info('Attempting to update briefing status badge', {
            isInMiro,
            projectId: updatedProject.id,
            projectName: updatedProject.name,
            status: updatedProject.status
          });

          if (isInMiro) {
            miroProjectRowService.updateBriefingStatus(
              updatedProject.id,
              updatedProject.status,
              updatedProject.name
            ).then(result => {
              logger.info('Briefing status badge update result', { success: result });
            }).catch(err => {
              logger.error('Briefing status badge update failed', err);
            });
          } else {
            logger.warn('Not in Miro, skipping briefing status badge update');
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/')}
            title="Back to Dashboard"
          >
            <BackIcon />
          </button>
          <div className={styles.logo}>
            <Logo size="md" />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.brandName}>BRIANNA DAWES STUDIOS</h1>
            <span className={styles.projectCount}>{totalProjects} projects</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          {user?.role === 'admin' && (
            <button
              className={styles.gridButton}
              onClick={handleOpenBoardModal}
              title="Open Project Board"
            >
              <GridIcon />
            </button>
          )}
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.name || 'User'}
              className={styles.avatar}
            />
          )}
        </div>
      </header>

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
