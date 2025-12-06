/**
 * Board Modal App
 * Standalone app for the Trello-style project board
 * This renders inside the Miro modal (canvas overlay)
 * Syncs with Miro Master Timeline when projects are moved
 */
import { useProjects, useProjectMutations } from '@features/projects';
import { useMiro, useMiroBoardSync, miroProjectRowService } from '@features/boards';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { STATUS_COLUMNS } from '@shared/lib/timelineStatus';
import { formatDateShort } from '@shared/lib/dateFormat';
import { projectKeys } from '@features/projects/services/projectKeys';
import { broadcastProjectChange } from '@shared/lib/projectBroadcast';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import { projectService } from '@features/projects/services/projectService';
import { createLogger } from '@shared/lib/logger';
import type { Project, ProjectStatus } from '@features/projects/domain/project.types';
import styles from './BoardModalApp.module.css';

const logger = createLogger('BoardModal');

// Icons
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const DragIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="2"/>
    <circle cx="15" cy="6" r="2"/>
    <circle cx="9" cy="12" r="2"/>
    <circle cx="15" cy="12" r="2"/>
    <circle cx="9" cy="18" r="2"/>
    <circle cx="15" cy="18" r="2"/>
  </svg>
);

export function BoardModalApp() {
  const { miro, isInMiro } = useMiro();
  const queryClient = useQueryClient();
  const { data: projectsData, isLoading, refetch } = useProjects({});
  const { updateProject } = useProjectMutations();
  const { initializeBoard, syncProject, syncAllProjects, isInitialized, isSyncing } = useMiroBoardSync();

  const projects = projectsData?.data || [];

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

      logger.info('BoardModal: Realtime update received', {
        projectId,
        oldStatus: oldRecord.status,
        newStatus: newRecord.status,
        wasReviewed: newRecord.was_reviewed,
      });

      // Mark as recently synced for 5 seconds
      recentlySyncedRef.current.add(projectId);
      setTimeout(() => recentlySyncedRef.current.delete(projectId), 5000);

      // Refetch projects to update the board UI
      await refetch();

      // Sync to Miro timeline
      if (isInMiro && isInitialized) {
        try {
          const fullProject = await projectService.getProject(projectId);
          await syncProject(fullProject, { markAsReviewed: fullProject.wasReviewed });

          // Also update briefing status badge
          await miroProjectRowService.updateBriefingStatus(projectId, fullProject.status, fullProject.name);

          logger.info('BoardModal: Miro sync completed', { projectId, status: fullProject.status });
        } catch (err) {
          logger.error('BoardModal: Miro sync failed', err);
        }
      }
    }, [refetch, isInMiro, isInitialized, syncProject]),
    enabled: true,
  });

  // Group projects by status (direct from database)
  const projectsByStatus = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = projects.filter(p => p.status === column.id);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);

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
      console.log('[BoardModal] Updating briefing status badge for:', projectName, newStatus);
      miroProjectRowService.updateBriefingStatus(projectId, newStatus, projectName)
        .then(result => {
          console.log('[BoardModal] Briefing status update result:', result);
        })
        .catch(err => {
          console.error('[BoardModal] Briefing status update failed:', err);
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

      logger.info('Project moved successfully', { name: projectName, status: newStatus });
    } catch (error) {
      logger.error('Failed to update project status', error);
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
              {projectsByStatus[column.id]?.map((project) => (
                <div
                  key={project.id}
                  className={`${styles.card} ${draggingProject?.id === project.id ? styles.cardDragging : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, project)}
                  onDragEnd={handleDragEnd}
                >
                  <div className={styles.cardDragHandle}>
                    <DragIcon />
                  </div>
                  <div className={styles.cardContent}>
                    <h4 className={styles.cardTitle}>{project.name}</h4>
                    <div className={styles.cardMeta}>
                      {project.client?.name && (
                        <span className={styles.cardClient}>{project.client.name}</span>
                      )}
                      {project.dueDate && (
                        <span className={styles.cardDue}>
                          {formatDateShort(project.dueDate)}
                        </span>
                      )}
                    </div>
                    {project.priority === 'urgent' && (
                      <span className={styles.cardUrgent}>URGENT</span>
                    )}
                  </div>
                  <div className={styles.cardAvatar}>
                    {project.client?.avatarUrl ? (
                      <img src={project.client.avatarUrl} alt={project.client.name} />
                    ) : (
                      <span>{project.client?.name?.charAt(0).toUpperCase() || 'C'}</span>
                    )}
                  </div>
                </div>
              ))}

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
