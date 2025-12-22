/**
 * Base Use Case Interface
 *
 * A Use Case represents a single, well-defined action in the system.
 * It encapsulates business logic and orchestrates the interaction
 * between repositories, services, and domain entities.
 *
 * Benefits:
 * - Single Responsibility: Each use case does one thing
 * - Testable: Easy to unit test with mocked dependencies
 * - Reusable: Can be called from controllers, CLI, jobs, etc.
 * - Explicit: Makes business operations visible in code structure
 *
 * @example
 * ```typescript
 * class CreateProjectUseCase implements UseCase<CreateProjectInput, Project> {
 *   constructor(
 *     private projectRepo: IProjectRepository,
 *     private notificationService: INotificationService
 *   ) {}
 *
 *   async execute(input: CreateProjectInput): Promise<Project> {
 *     const project = await this.projectRepo.create(input);
 *     await this.notificationService.notifyDesigners(project);
 *     return project;
 *   }
 * }
 * ```
 */

export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Use case with no input (e.g., GetAllUsers)
 */
export interface UseCaseNoInput<TOutput> {
  execute(): Promise<TOutput>;
}

/**
 * Use case with no output (e.g., SendNotification)
 */
export interface UseCaseNoOutput<TInput> {
  execute(input: TInput): Promise<void>;
}

/**
 * Result type for use cases that can fail with business errors
 * (as opposed to exceptions for unexpected errors)
 */
export type UseCaseResult<T, E = string> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper to create success result
 */
export function success<T>(data: T): UseCaseResult<T, never> {
  return { success: true, data };
}

/**
 * Helper to create failure result
 */
export function failure<E>(error: E): UseCaseResult<never, E> {
  return { success: false, error };
}
