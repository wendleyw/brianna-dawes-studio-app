/**
 * Create Project Use Case
 *
 * Handles the business logic for creating a new project.
 * This use case:
 * - Validates input data
 * - Creates the project via repository (atomic operation)
 * - Events are automatically emitted by the repository
 *
 * The repository handles designer assignments atomically,
 * so if assignment fails, the project is not created.
 */

import type { UseCase, UseCaseResult } from '@shared/core/use-cases/UseCase';
import { success, failure } from '@shared/core/use-cases/UseCase';
import type { IProjectRepository } from '@shared/core/repositories/IProjectRepository';
import type { Project, CreateProjectInput } from '../domain/project.types';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('CreateProjectUseCase');

export type CreateProjectError =
  | 'INVALID_INPUT'
  | 'CLIENT_NOT_FOUND'
  | 'DESIGNER_NOT_FOUND'
  | 'DATABASE_ERROR';

export class CreateProjectUseCase
  implements UseCase<CreateProjectInput, UseCaseResult<Project, CreateProjectError>>
{
  constructor(private projectRepository: IProjectRepository) {}

  async execute(input: CreateProjectInput): Promise<UseCaseResult<Project, CreateProjectError>> {
    // Validate required fields
    if (!input.name || input.name.trim() === '') {
      logger.warn('Invalid input: name is required');
      return failure('INVALID_INPUT');
    }

    if (!input.clientId) {
      logger.warn('Invalid input: clientId is required');
      return failure('INVALID_INPUT');
    }

    try {
      logger.info('Creating project', { name: input.name, clientId: input.clientId });

      const project = await this.projectRepository.create(input);

      logger.info('Project created successfully', { projectId: project.id });

      return success(project);
    } catch (error) {
      logger.error('Failed to create project', error);

      // Map specific errors to business errors
      if (error instanceof Error) {
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
