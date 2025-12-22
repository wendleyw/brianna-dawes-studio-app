/**
 * Project Repository Interface
 *
 * Defines the contract for project data access. This abstraction allows:
 * - Easy testing with mock implementations
 * - Swapping data sources (Supabase, REST API, etc.)
 * - Clear separation between business logic and data access
 *
 * @example
 * ```typescript
 * // In use case
 * class CreateProjectUseCase {
 *   constructor(private projectRepo: IProjectRepository) {}
 *
 *   async execute(input: CreateProjectInput): Promise<Project> {
 *     return this.projectRepo.create(input);
 *   }
 * }
 *
 * // In tests
 * const mockRepo: IProjectRepository = {
 *   create: jest.fn().mockResolvedValue(mockProject),
 *   // ...
 * };
 * ```
 */

import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectsQueryParams,
  ProjectsResponse,
  MiroSyncStatus,
} from '@features/projects/domain/project.types';

export interface IProjectRepository {
  /**
   * Get paginated list of projects with filters
   */
  getAll(params?: ProjectsQueryParams): Promise<ProjectsResponse>;

  /**
   * Get projects assigned to a specific designer
   */
  getForDesigner(designerId: string, params?: ProjectsQueryParams): Promise<ProjectsResponse>;

  /**
   * Get a single project by ID
   */
  getById(id: string): Promise<Project>;

  /**
   * Create a new project with optional designer assignments
   * This operation is atomic - if designer assignment fails, project is not created
   */
  create(input: CreateProjectInput): Promise<Project>;

  /**
   * Update an existing project
   * This operation is atomic - all changes succeed or none do
   */
  update(id: string, input: UpdateProjectInput): Promise<Project>;

  /**
   * Delete a project (admin only, enforced by RLS)
   */
  delete(id: string): Promise<void>;

  /**
   * Archive a project (sets status to 'done' and archived_at timestamp)
   */
  archive(id: string): Promise<Project>;

  /**
   * Update the Miro sync status for a project
   */
  updateSyncStatus(
    projectId: string,
    status: MiroSyncStatus,
    options?: {
      errorMessage?: string | null;
      miroCardId?: string | null;
      miroFrameId?: string | null;
      incrementRetry?: boolean;
    }
  ): Promise<void>;

  /**
   * Clear Miro references when card/frame is deleted from board
   */
  clearMiroReferences(
    projectId: string,
    options?: { clearCard?: boolean; clearFrame?: boolean }
  ): Promise<void>;

  /**
   * Get projects that need to be synced with Miro
   */
  getProjectsNeedingSync(maxRetries?: number): Promise<Project[]>;

  /**
   * Get sync health metrics for monitoring
   */
  getSyncHealthMetrics(): Promise<{
    totalProjects: number;
    syncedCount: number;
    pendingCount: number;
    errorCount: number;
    syncingCount: number;
    syncSuccessRate: number;
    avgRetryCount: number;
    lastSyncError: string | null;
    lastErrorProjectName: string | null;
  }>;
}
