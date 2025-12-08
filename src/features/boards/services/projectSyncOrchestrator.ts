/**
 * Project Sync Orchestrator
 *
 * Manages synchronization between Supabase projects and Miro boards.
 * Provides robust error handling, retry logic, and status tracking.
 *
 * Responsibilities:
 * - Orchestrate project creation with Miro sync
 * - Handle sync failures with automatic retry
 * - Track sync status in database
 * - Provide observability for sync health
 *
 * @example
 * ```typescript
 * import { projectSyncOrchestrator } from './projectSyncOrchestrator';
 *
 * // Create project with sync
 * const project = await projectSyncOrchestrator.createProjectWithSync({
 *   name: 'New Project',
 *   clientId: 'uuid',
 * });
 *
 * // Retry failed syncs
 * await projectSyncOrchestrator.retryFailedSyncs();
 * ```
 */

import { createLogger } from '@shared/lib/logger';
import { miroAdapter } from '@shared/lib/miroAdapter';
import { projectService } from '@features/projects/services/projectService';
import { miroTimelineService, miroProjectRowService } from './index';
import type {
  Project,
  CreateProjectInput,
  MiroSyncStatus,
  ProjectBriefing,
} from '@features/projects/domain/project.types';

const logger = createLogger('ProjectSyncOrchestrator');

// Configuration
const SYNC_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // Base delay, will use exponential backoff
  SYNC_TIMEOUT_MS: 30000, // 30 seconds max for sync operation
};

// Sync result types
interface SyncResult {
  success: boolean;
  project: Project;
  miroCardId?: string | undefined;
  miroFrameId?: string | undefined;
  error?: Error | undefined;
  retryable: boolean;
}

interface SyncAttemptResult {
  success: boolean;
  error?: Error | undefined;
  miroCardId?: string | undefined;
  miroFrameId?: string | undefined;
}

// Error categorization for better retry decisions
type SyncErrorCategory =
  | 'miro_unavailable' // Miro SDK not available
  | 'miro_api_error' // Miro API returned an error
  | 'network_error' // Network connectivity issue
  | 'timeout' // Operation timed out
  | 'validation_error' // Invalid data
  | 'unknown'; // Unknown error

class ProjectSyncOrchestrator {
  /**
   * Create a new project and sync it to Miro
   * Handles the full lifecycle: DB create -> Miro sync -> status update
   */
  async createProjectWithSync(input: CreateProjectInput): Promise<SyncResult> {
    logger.info('Creating project with sync', { name: input.name });

    // Step 1: Create project in Supabase with pending status
    let project: Project;
    try {
      project = await projectService.createProject(input);
      logger.debug('Project created in DB', { id: project.id, name: project.name });
    } catch (error) {
      logger.error('Failed to create project in DB', error);
      throw error; // Can't recover from DB creation failure
    }

    // Step 2: Attempt Miro sync
    const syncResult = await this.syncProjectToMiro(project);

    return {
      ...syncResult,
      project: await projectService.getProject(project.id), // Get fresh data
    };
  }

  /**
   * Sync an existing project to Miro
   * Updates sync status throughout the process
   */
  async syncProjectToMiro(project: Project): Promise<SyncResult> {
    const startTime = Date.now();
    logger.info('Syncing project to Miro', {
      id: project.id,
      name: project.name,
      currentSyncStatus: project.syncStatus,
    });

    // Check if Miro is available
    if (!miroAdapter.isAvailable()) {
      logger.warn('Miro SDK not available, marking as pending');
      await this.updateSyncStatus(project.id, 'pending', {
        errorMessage: 'Miro SDK not available',
      });
      return {
        success: false,
        project,
        error: new Error('Miro SDK not available'),
        retryable: true,
      };
    }

    // Mark as syncing
    await this.updateSyncStatus(project.id, 'syncing');

    // Attempt sync with retry logic
    const result = await this.attemptSyncWithRetry(project);

    // Update final status
    if (result.success) {
      // Build options object, only include defined values
      const syncOptions: {
        miroCardId?: string;
        miroFrameId?: string;
      } = {};
      if (result.miroCardId) syncOptions.miroCardId = result.miroCardId;
      if (result.miroFrameId) syncOptions.miroFrameId = result.miroFrameId;

      await this.updateSyncStatus(project.id, 'synced', syncOptions);
      logger.info('Project synced successfully', {
        id: project.id,
        duration: Date.now() - startTime,
      });
    } else {
      await this.updateSyncStatus(project.id, 'sync_error', {
        errorMessage: result.error?.message || 'Unknown sync error',
        incrementRetry: true,
      });
      this.reportError(project, result.error);
    }

    return {
      success: result.success,
      project,
      miroCardId: result.miroCardId,
      miroFrameId: result.miroFrameId,
      error: result.error,
      retryable: this.isRetryableError(result.error),
    };
  }

  /**
   * Attempt sync with exponential backoff retry
   */
  private async attemptSyncWithRetry(project: Project): Promise<SyncAttemptResult> {
    let lastError: Error | undefined;
    let miroCardId: string | undefined;
    let miroFrameId: string | undefined;

    for (let attempt = 0; attempt < SYNC_CONFIG.MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = SYNC_CONFIG.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        logger.debug(`Retry attempt ${attempt + 1}, waiting ${delay}ms`);
        await this.sleep(delay);
      }

      try {
        const result = await this.performSync(project);
        return {
          success: true,
          miroCardId: result.cardId,
          miroFrameId: result.frameId,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(`Sync attempt ${attempt + 1} failed`, {
          projectId: project.id,
          error: lastError.message,
        });

        // Don't retry non-retryable errors
        if (!this.isRetryableError(lastError)) {
          break;
        }
      }
    }

    return {
      success: false,
      error: lastError,
      miroCardId,
      miroFrameId,
    };
  }

  /**
   * Perform the actual Miro sync operations
   */
  private async performSync(project: Project): Promise<{ cardId?: string | undefined; frameId?: string | undefined }> {
    let cardId: string | undefined;
    let frameId: string | undefined;

    // Create/update timeline card
    try {
      await miroTimelineService.syncProject(project);
      // Get the card ID from the timeline service's state
      const cardInfo = await this.getProjectCardInfo(project);
      cardId = cardInfo?.cardId;
    } catch (error) {
      logger.error('Failed to sync timeline card', error);
      throw error;
    }

    // Create/update project row (briefing frame) if briefing exists
    if (project.briefing) {
      try {
        await miroProjectRowService.createProjectRow(
          project,
          project.briefing as ProjectBriefing
        );
        // The frame ID could be retrieved similarly
        const frameInfo = await this.getProjectFrameInfo(project);
        frameId = frameInfo?.frameId;
      } catch (error) {
        logger.warn('Failed to create project row, timeline card still synced', error);
        // Don't throw - partial sync is acceptable
      }
    }

    return { cardId, frameId };
  }

  /**
   * Get card info for a project from Miro board
   */
  private async getProjectCardInfo(
    project: Project
  ): Promise<{ cardId: string } | null> {
    try {
      const cards = await miroAdapter.getBoardItems<{
        id: string;
        title?: string;
      }>('card');

      const projectCard = cards.find(
        (card) =>
          card.title?.includes(project.name) ||
          card.title?.includes(`[PROJ-${project.id.slice(0, 8)}]`)
      );

      return projectCard ? { cardId: projectCard.id } : null;
    } catch {
      return null;
    }
  }

  /**
   * Get frame info for a project from Miro board
   */
  private async getProjectFrameInfo(
    project: Project
  ): Promise<{ frameId: string } | null> {
    try {
      const frames = await miroAdapter.getBoardItems<{
        id: string;
        title?: string;
      }>('frame');

      const projectFrame = frames.find(
        (frame) =>
          frame.title?.includes(project.name) ||
          frame.title?.includes('BRIEFING')
      );

      return projectFrame ? { frameId: projectFrame.id } : null;
    } catch {
      return null;
    }
  }

  /**
   * Retry all failed syncs
   * Useful for batch recovery after Miro was unavailable
   */
  async retryFailedSyncs(): Promise<{
    attempted: number;
    succeeded: number;
    failed: number;
    results: SyncResult[];
  }> {
    logger.info('Starting retry of failed syncs');

    const projectsNeedingSync = await projectService.getProjectsNeedingSync(
      SYNC_CONFIG.MAX_RETRIES
    );

    logger.debug('Found projects needing sync', {
      count: projectsNeedingSync.length,
    });

    const results: SyncResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (const project of projectsNeedingSync) {
      const result = await this.syncProjectToMiro(project);
      results.push(result);

      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }

      // Small delay between syncs to avoid rate limiting
      await this.sleep(500);
    }

    logger.info('Retry of failed syncs complete', {
      attempted: projectsNeedingSync.length,
      succeeded,
      failed,
    });

    return {
      attempted: projectsNeedingSync.length,
      succeeded,
      failed,
      results,
    };
  }

  /**
   * Force sync a specific project (ignoring retry limits)
   */
  async forceSyncProject(projectId: string): Promise<SyncResult> {
    logger.info('Force syncing project', { projectId });

    // Reset retry count first
    await projectService.updateSyncStatus(projectId, 'pending');

    const project = await projectService.getProject(projectId);
    return this.syncProjectToMiro(project);
  }

  /**
   * Get current sync health metrics
   */
  async getSyncHealth(): Promise<{
    totalProjects: number;
    syncedCount: number;
    pendingCount: number;
    errorCount: number;
    syncingCount: number;
    syncSuccessRate: number;
    avgRetryCount: number;
    lastSyncError: string | null;
    lastErrorProjectName: string | null;
    miroAvailable: boolean;
  }> {
    const metrics = await projectService.getSyncHealthMetrics();
    return {
      ...metrics,
      miroAvailable: miroAdapter.isAvailable(),
    };
  }

  // ==================== PRIVATE HELPERS ====================

  private async updateSyncStatus(
    projectId: string,
    status: MiroSyncStatus,
    options?: {
      errorMessage?: string;
      miroCardId?: string;
      miroFrameId?: string;
      incrementRetry?: boolean;
    }
  ): Promise<void> {
    try {
      await projectService.updateSyncStatus(projectId, status, options);
    } catch (error) {
      logger.error('Failed to update sync status', { projectId, status, error });
    }
  }

  private categorizeError(error: Error | undefined): SyncErrorCategory {
    if (!error) return 'unknown';

    const message = error.message.toLowerCase();

    if (message.includes('miro sdk not available') || message.includes('not in miro')) {
      return 'miro_unavailable';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return 'network_error';
    }
    if (message.includes('api') || message.includes('rate limit')) {
      return 'miro_api_error';
    }
    if (message.includes('invalid') || message.includes('validation')) {
      return 'validation_error';
    }

    return 'unknown';
  }

  private isRetryableError(error: Error | undefined): boolean {
    const category = this.categorizeError(error);
    // Don't retry validation errors
    return category !== 'validation_error';
  }

  private reportError(project: Project, error: Error | undefined): void {
    if (!error) return;

    const category = this.categorizeError(error);

    logger.error('Sync failed', {
      projectId: project.id,
      projectName: project.name,
      errorCategory: category,
      errorMessage: error.message,
      retryCount: project.syncRetryCount,
    });

    // TODO: Integrate with Sentry when configured
    // Sentry.captureException(error, {
    //   tags: {
    //     feature: 'miro_sync',
    //     errorCategory: category,
    //   },
    //   extra: {
    //     projectId: project.id,
    //     projectName: project.name,
    //     retryCount: project.syncRetryCount,
    //   },
    // });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const projectSyncOrchestrator = new ProjectSyncOrchestrator();
