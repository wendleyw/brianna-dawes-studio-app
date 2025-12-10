/**
 * Update Project Use Case
 *
 * Handles the business logic for updating an existing project.
 * This use case:
 * - Validates input data
 * - Updates the project via repository (atomic operation)
 * - Events are automatically emitted by the repository
 *
 * The repository handles designer assignments atomically,
 * so all changes succeed or none do.
 */

import type { UseCase, UseCaseResult } from '@shared/core/use-cases/UseCase';
import { success, failure } from '@shared/core/use-cases/UseCase';
import type { IProjectRepository } from '@shared/core/repositories/IProjectRepository';
import type { Project, UpdateProjectInput } from '../domain/project.types';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('UpdateProjectUseCase');

export interface UpdateProjectUseCaseInput {
  projectId: string;
  data: UpdateProjectInput;
}

export type UpdateProjectError =
  | 'INVALID_INPUT'
  | 'PROJECT_NOT_FOUND'
  | 'CLIENT_NOT_FOUND'
  | 'DESIGNER_NOT_FOUND'
  | 'DATABASE_ERROR';

export class UpdateProjectUseCase
  implements UseCase<UpdateProjectUseCaseInput, UseCaseResult<Project, UpdateProjectError>>
{
  constructor(private projectRepository: IProjectRepository) {}

  async execute(
    input: UpdateProjectUseCaseInput
  ): Promise<UseCaseResult<Project, UpdateProjectError>> {
    const { projectId, data } = input;

    // Validate project ID
    if (!projectId) {
      logger.warn('Invalid input: projectId is required');
      return failure('INVALID_INPUT');
    }

    // Validate that at least one field is being updated
    if (Object.keys(data).length === 0) {
      logger.warn('Invalid input: no fields to update');
      return failure('INVALID_INPUT');
    }

    try {
      logger.info('Updating project', { projectId, fields: Object.keys(data) });

      const project = await this.projectRepository.update(projectId, data);

      logger.info('Project updated successfully', { projectId });

      return success(project);
    } catch (error) {
      logger.error('Failed to update project', error);

      // Map specific errors to business errors
      if (error instanceof Error) {
        if (error.message.includes('PGRST116') || error.message.includes('no rows')) {
          return failure('PROJECT_NOT_FOUND');
        }
        if (error.message.includes('foreign key') && error.message.includes('client_id')) {
          return failure('CLIENT_NOT_FOUND');
        }
        if (error.message.includes('foreign key') && error.message.includes('user_id')) {
          return failure('DESIGNER_NOT_FOUND');
        }
      }

      return failure('DATABASE_ERROR');
    }
  }
}
