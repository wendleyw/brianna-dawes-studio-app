/**
 * Project Use Cases
 *
 * Factory functions to create use case instances with their dependencies.
 * This provides a clean API for consumers while managing dependency injection.
 *
 * @example
 * ```typescript
 * import { createProject, updateProject } from '@features/projects/use-cases';
 *
 * // Create a project
 * const result = await createProject.execute({
 *   name: 'Website Redesign',
 *   clientId: 'uuid',
 * });
 *
 * if (result.success) {
 *   console.log('Created:', result.data);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */

export { CreateProjectUseCase } from './CreateProjectUseCase';
export type { CreateProjectError } from './CreateProjectUseCase';

export { UpdateProjectUseCase } from './UpdateProjectUseCase';
export type { UpdateProjectUseCaseInput, UpdateProjectError } from './UpdateProjectUseCase';

// Re-export use case base types
export type { UseCase, UseCaseResult } from '@shared/core/use-cases/UseCase';
export { success, failure } from '@shared/core/use-cases/UseCase';

// ============================================================================
// Factory Functions - Pre-configured use cases with dependencies injected
// ============================================================================

import { projectRepository } from '../infra/SupabaseProjectRepository';
import { CreateProjectUseCase } from './CreateProjectUseCase';
import { UpdateProjectUseCase } from './UpdateProjectUseCase';

/**
 * Pre-configured CreateProjectUseCase with Supabase repository
 */
export const createProjectUseCase = new CreateProjectUseCase(projectRepository);

/**
 * Pre-configured UpdateProjectUseCase with Supabase repository
 */
export const updateProjectUseCase = new UpdateProjectUseCase(projectRepository);
