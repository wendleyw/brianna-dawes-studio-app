/**
 * Board Modal App
 * Standalone app for the Trello-style project board
 * This renders inside the Miro modal (canvas overlay)
 * Syncs with Miro Master Timeline when projects are moved
 */
import { useProjects, useProjectMutations } from '@features/projects';
import { useMiro, useMiroBoardSync, miroProjectRowService, zoomToProject } from '@features/boards';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ProjectFilters as ProjectFiltersType } from '@features/projects/domain/project.types';
import { STATUS_COLUMNS } from '@shared/lib/timelineStatus';
import { formatDateShort } from '@shared/lib/dateFormat';
import { projectKeys } from '@features/projects/services/projectKeys';
import { broadcastProjectChange } from '@shared/lib/projectBroadcast';
import { MiroNotifications } from '@shared/lib/miroNotifications';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import { projectService } from '@features/projects/services/projectService';
import { createLogger } from '@shared/lib/logger';
import { SYNC_TIMING } from '@shared/config';
import type { Project, ProjectStatus } from '@features/projects/domain/project.types';
import styles from './BoardModalApp.module.css';

const logger = createLogger('BoardModal');
const EMPTY_PROJECTS: Project[] = [];

// Icons
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export function BoardModalApp() {
  const { miro, isInMiro, boardId: currentBoardId } = useMiro();
  const queryClient = useQueryClient();

  // IMPORTANT: Filter projects by current board for data isolation
  const filters: ProjectFiltersType = useMemo(() => {
    const f: ProjectFiltersType = {};
    if (isInMiro && currentBoardId) {
      f.miroBoardId = currentBoardId;
    }
    return f;
  }, [isInMiro, currentBoardId]);

  // Fetch ALL projects (pageSize: 1000 to avoid pagination limits)
  const { data: projectsData, isLoading, refetch } = useProjects({ filters, pageSize: 1000 });
  const { updateProject } = useProjectMutations();
  const { initializeBoard, syncProject, syncAllProjects, isInitialized, isSyncing } = useMiroBoardSync();

  const projects = useMemo(() => projectsData?.data ?? EMPTY_PROJECTS, [projectsData?.data]);

  const [draggingProject, setDraggingProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  // Track if initial sync has been done
  const initialSyncDoneRef = useRef(false);

  // Initialize Miro timeline on mount
  useEffect(() => {
    if (isInMiro && !isInitialized && !isLoading) {
      initializeBoard();
    }
  }, [isInMiro, isInitialized, isLoading, initializeBoard]);

  // Initial sync of all projects (only once, with cleanup)
  useEffect(() => {
    if (isInitialized && projects.length > 0 && !initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      logger.info('Initial sync with duplicate cleanup', { count: projects.length });
      // Use syncAllProjects which cleans up duplicates first
      syncAllProjects(projects).catch(err => logger.error('Sync failed', err));
    }
  }, [isInitialized, projects, syncAllProjects]);

  // Track recently synced projects to avoid duplicate syncs
  const recentlySyncedRef = useRef<Set<string>>(new Set());

  // Supabase Realtime subscription for cross-user sync
  // Updates the board in real-time when any user changes a project
  useRealtimeSubscription<{ id: string; status: string; was_reviewed: boolean }>({
    table: 'projects',
    event: 'UPDATE',
    onUpdate: useCallback(async (newRecord, oldRecord) => {
      const projectId = newRecord.id;

      // Skip if we just synced this project (to avoid loops from our own changes)
      if (recentlySyncedRef.current.has(projectId)) {
        logger.debug('BoardModal: Skipping - recently synced', { projectId });
        return;
      }

      // Skip if status didn't actually change (avoid unnecessary syncs)
      if (newRecord.status === oldRecord.status && newRecord.was_reviewed === oldRecord.was_reviewed) {
        logger.debug('BoardModal: Skipping - no status change', { projectId });
        await refetch(); // Still refetch to update UI
        return;
      }

      logger.info('BoardModal: Realtime update received', {
        projectId,
        oldStatus: oldRecord.status,
        newStatus: newRecord.status,
        wasReviewed: newRecord.was_reviewed,
      });

      // Mark as recently synced for 5 seconds
      recentlySyncedRef.current.add(projectId);
      setTimeout(() => recentlySyncedRef.current.delete(projectId), SYNC_TIMING.RECENT_SYNC_COOLDOWN);

      // Refetch projects to update the board UI
      await refetch();

      // Sync to Miro timeline (only for projects on this board)
      if (isInMiro && isInitialized) {
        try {
          const fullProject = await projectService.getProject(projectId);

          // IMPORTANT: Only sync projects that belong to this board
          if (currentBoardId && fullProject.miroBoardId !== currentBoardId) {
            logger.debug('BoardModal: Skipping sync - project belongs to different board', {
              projectId,
              projectBoardId: fullProject.miroBoardId,
              currentBoardId,
            });
            return;
          }

          await syncProject(fullProject, { markAsReviewed: fullProject.wasReviewed });

          // Also update briefing status badge
          await miroProjectRowService.updateBriefingStatus(projectId, fullProject.status, fullProject.name);

          logger.info('BoardModal: Miro sync completed', { projectId, status: fullProject.status });
        } catch (err) {
          logger.error('BoardModal: Miro sync failed', err);
        }
      }
    }, [refetch, isInMiro, isInitialized, syncProject, currentBoardId]),
    enabled: true,
  });

  // Group projects by status (memoized to prevent recalculation on every render)
  const projectsByStatus = useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.id] = projects.filter(p => p.status === column.id);
      return acc;
    }, {} as Record<ProjectStatus, Project[]>);
  }, [projects]);

  const handleClose = useCallback(async () => {
    if (miro) {
      await miro.board.ui.closeModal();
    }
  }, [miro]);

  const handleDragStart = useCallback((e: React.DragEvent, project: Project) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);
    setDraggingProject(project);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingProject(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: ProjectStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggingProject) return;
    if (draggingProject.status === newStatus) return;

    const projectId = draggingProject.id;
    const projectName = draggingProject.name;

    // Mark as recently synced to prevent realtime subscription from re-syncing
    recentlySyncedRef.current.add(projectId);
    setTimeout(() => recentlySyncedRef.current.delete(projectId), 5000);

    try {
      logger.debug('Moving project', { name: projectName, newStatus });

      // 1. Update status in database
      const updatedProjectFromDB = await updateProject.mutateAsync({
        id: projectId,
        input: { status: newStatus },
      });

      // 2. Sync with Miro Master Timeline using the DB response
      await syncProject(updatedProjectFromDB);

      // 3. Update the status badge in the briefing frame
      logger.debug('Updating briefing status badge', { projectName, newStatus });
      miroProjectRowService.updateBriefingStatus(projectId, newStatus, projectName)
        .then(result => {
          logger.debug('Briefing status update result', { result });
        })
        .catch(err => {
          logger.error('Briefing status update failed', err);
        });

      // 4. Invalidate and refetch to ensure UI is in sync
      await queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      await refetch();

      // 4. Broadcast to other contexts (panel) to refresh their data
      broadcastProjectChange({
        type: 'PROJECT_UPDATED',
        projectId,
        status: newStatus,
      });

      // 5. Show Miro notification
      const statusLabel = STATUS_COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
      await MiroNotifications.projectStatusChanged(projectName, statusLabel);

      logger.info('Project moved successfully', { name: projectName, status: newStatus });
    } catch (error) {
      logger.error('Failed to update project status', error);
      await MiroNotifications.error('Failed to update project status');
      // Refetch to revert optimistic update
      await refetch();
    }
  }, [draggingProject, updateProject, syncProject, queryClient, refetch]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading projects...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h1>Project Board</h1>
          <span className={styles.headerSubtitle}>
            {isSyncing ? 'Syncing with Miro...' : 'Drag to change status'}
          </span>
        </div>
        <button className={styles.closeBtn} onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>

      {/* Board */}
      <div className={styles.board}>
        {STATUS_COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`${styles.column} ${dragOverColumn === column.id ? styles.columnDragOver : ''}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div className={styles.columnHeader}>
              <span className={styles.columnDot} style={{ backgroundColor: column.color }} />
              <span className={styles.columnTitle}>{column.label}</span>
              <span className={styles.columnCount}>{projectsByStatus[column.id]?.length || 0}</span>
            </div>

            {/* Column Content */}
            <div className={styles.columnContent}>
              {projectsByStatus[column.id]?.map((project) => {
                const isArchived = project.archivedAt !== null;
                const showClientApproved = project.wasApproved;
                const showClientReviewed = project.wasReviewed && !project.wasApproved;
                const showDueDateRequested = !!project.dueDateRequestedAt;
                const showClientAction = showClientApproved || showClientReviewed || showDueDateRequested;

                return (
                  <div
                    key={project.id}
                    className={`${styles.card} ${draggingProject?.id === project.id ? styles.cardDragging : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project)}
                    onDragEnd={handleDragEnd}
                    onClick={async () => {
                      // Close modal and zoom to project in Miro board
                      if (miro) {
                        await miro.board.ui.closeModal();
                      }
                      await zoomToProject(project.id);
                    }}
                  >
                  {/* Header: Priority badge + Name */}
                  <div className={styles.cardHeader}>
                    {project.priority && (
                      <span className={`${styles.cardPriority} ${styles[`priority${project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}`]}`}>
                        {project.priority.toUpperCase()}
                      </span>
                    )}
                    <h4 className={styles.cardTitle} title={project.name || 'Untitled project'}>
                      {project.name || 'Untitled project'}
                    </h4>
                  </div>

                  {/* Badges */}
                  {(isArchived || showClientAction) && (
                    <div className={styles.cardBadges}>
                      {showClientApproved && (
                        <span className={`${styles.badge} ${styles.badgeApproved}`}>CLIENT APPROVED</span>
                      )}
                      {showClientReviewed && (
                        <span className={`${styles.badge} ${styles.badgeReviewed}`}>CHANGES REQUESTED</span>
                      )}
                      {showDueDateRequested && (
                        <span className={`${styles.badge} ${styles.badgeClientAction}`}>DUE DATE REQUEST</span>
                      )}
                      {isArchived && (
                        <span className={`${styles.badge} ${styles.badgeArchived}`}>ARCHIVED</span>
                      )}
                    </div>
                  )}

                  {/* Client */}
                  {project.client?.name && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Client</span>
                      <span className={styles.cardClient}>{project.client.name}</span>
                    </div>
                  )}

                  {/* Designers */}
                  {project.designers && project.designers.length > 0 && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Team</span>
                      <span className={styles.cardDesigners}>
                        {project.designers.map(d => d.name?.split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  )}

                  {/* Due Date */}
                  {project.dueDate && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Due</span>
                      <span className={styles.cardDue}>{formatDateShort(project.dueDate)}</span>
                    </div>
                  )}

                  {/* Project Type */}
                  {project.briefing?.projectType && (
                    <div className={styles.cardRow}>
                      <span className={styles.cardLabel}>Type</span>
                      <span className={styles.cardType}>{project.briefing.projectType.replace(/-/g, ' ')}</span>
                    </div>
                  )}
                  </div>
                );
              })}

              {projectsByStatus[column.id]?.length === 0 && (
                <div className={styles.emptyColumn}>
                  <span>No projects</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
