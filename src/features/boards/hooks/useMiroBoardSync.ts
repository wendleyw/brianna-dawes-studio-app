/**
 * Hook for syncing projects with Miro board
 * Uses Miro SDK v2 to create/update timeline and project rows
 * Includes role-based validation for operations
 */
import { useCallback, useState } from 'react';
import { useMiro } from '../context/MiroContext';
import { miroTimelineService, miroProjectRowService } from '../services';
import { createLogger } from '@shared/lib/logger';
import { useAuth } from '@features/auth/hooks/useAuth';
import { hasPermission, canAccessProject } from '@shared/config/roles';
import type { Project, ProjectBriefing } from '@features/projects/domain/project.types';

const log = createLogger('MiroBoardSync');

interface SyncProjectOptions {
  markAsReviewed?: boolean;
}

interface UseMiroBoardSyncReturn {
  isInitialized: boolean;
  isSyncing: boolean;
  error: string | null;
  initializeBoard: () => Promise<void>;
  syncProject: (project: Project, options?: SyncProjectOptions) => Promise<void>;
  createProjectRow: (project: Project, briefing: ProjectBriefing) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  syncAllProjects: (projects: Project[]) => Promise<void>;
  cleanupDuplicates: () => Promise<number>;
}

export function useMiroBoardSync(): UseMiroBoardSyncReturn {
  const { isInMiro, miro } = useMiro();
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize the Miro board with Master Timeline
   */
  const initializeBoard = useCallback(async () => {
    if (!isInMiro || !miro) {
      setError('Not running inside Miro');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await miroTimelineService.initializeTimeline();
      setIsInitialized(true);
      log.debug('Board initialized with Master Timeline');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize board';
      setError(message);
      log.error('Initialization failed', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isInMiro, miro]);

  /**
   * Sync a single project to the Master Timeline
   * Validates user has access to the project before syncing
   */
  const syncProject = useCallback(async (project: Project, options?: SyncProjectOptions) => {
    if (!isInMiro || !miro) {
      log.warn('Not in Miro, skipping sync');
      return;
    }

    // Validate user has access to this project
    if (!canAccessProject(user, project)) {
      log.warn('User does not have access to sync this project', { projectId: project.id, userId: user?.id });
      setError('Access denied: You can only sync projects you have access to');
      return;
    }

    if (!isInitialized) {
      log.warn('Board not initialized, initializing first...');
      await initializeBoard();
    }

    setIsSyncing(true);
    setError(null);

    try {
      await miroTimelineService.syncProject(project, options);
      log.debug('Project synced', { name: project.name, options });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync project';
      setError(message);
      log.error('Error syncing project', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isInMiro, miro, isInitialized, initializeBoard, user]);

  /**
   * Create project row with briefing and process versions
   * Validates user has access to the project
   */
  const createProjectRow = useCallback(async (project: Project, briefing: ProjectBriefing) => {
    if (!isInMiro || !miro) {
      log.warn('Not in Miro, skipping project row creation');
      return;
    }

    // Validate user has access to this project
    if (!canAccessProject(user, project)) {
      log.warn('User does not have access to create project row', { projectId: project.id });
      setError('Access denied');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await miroProjectRowService.createProjectRow(project, briefing);
      log.debug('Project row created', { name: project.name });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create project row';
      setError(message);
      log.error('Error creating project row', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isInMiro, miro, user]);

  /**
   * Remove a project from the Miro board
   * Only admin can delete from board
   */
  const removeProject = useCallback(async (projectId: string) => {
    if (!isInMiro || !miro) {
      return;
    }

    // Only admin can delete from board
    if (!user || !hasPermission(user.role, 'canDeleteFromBoard')) {
      log.warn('User does not have permission to delete from board', { userId: user?.id });
      setError('Access denied: Only administrators can remove projects from the board');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      await miroTimelineService.removeProject(projectId);
      await miroProjectRowService.removeProjectRow(projectId);
      log.debug('Project removed', { projectId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove project';
      setError(message);
      log.error('Error removing project', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isInMiro, miro, user]);

  /**
   * Sync all projects to the Master Timeline
   * Only admin can sync all projects at once
   */
  const syncAllProjects = useCallback(async (projects: Project[]) => {
    if (!isInMiro || !miro) {
      log.warn('Not in Miro, skipping sync');
      return;
    }

    // Only admin can sync all projects
    if (!user || !hasPermission(user.role, 'canSyncAllProjects')) {
      log.warn('User does not have permission to sync all projects', { userId: user?.id });
      setError('Access denied: Only administrators can sync all projects');
      return;
    }

    if (!isInitialized) {
      await initializeBoard();
    }

    setIsSyncing(true);
    setError(null);

    try {
      // First cleanup any duplicates
      await miroTimelineService.cleanupDuplicates();

      // Then sync all projects sequentially
      for (const project of projects) {
        await miroTimelineService.syncProject(project);
      }
      log.info('All projects synced', { count: projects.length });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync projects';
      setError(message);
      log.error('Error syncing projects', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isInMiro, miro, isInitialized, initializeBoard, user]);

  /**
   * Clean up duplicate cards on the board
   * Only admin can cleanup duplicates
   */
  const cleanupDuplicates = useCallback(async (): Promise<number> => {
    if (!isInMiro || !miro) {
      return 0;
    }

    // Only admin can cleanup duplicates
    if (!user || !hasPermission(user.role, 'canModifyBoardLayout')) {
      log.warn('User does not have permission to cleanup duplicates');
      return 0;
    }

    try {
      const count = await miroTimelineService.cleanupDuplicates();
      log.debug('Cleaned up duplicates', { count });
      return count;
    } catch (err) {
      log.error('Error cleaning duplicates', err);
      return 0;
    }
  }, [isInMiro, miro, user]);

  return {
    isInitialized,
    isSyncing,
    error,
    initializeBoard,
    syncProject,
    createProjectRow,
    removeProject,
    syncAllProjects,
    cleanupDuplicates,
  };
}
