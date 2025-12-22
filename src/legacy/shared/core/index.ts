/**
 * Core Module Exports
 *
 * Provides the foundational building blocks for Clean Architecture:
 * - Event Bus for pub/sub communication
 * - Repository interfaces for data access abstraction
 * - Use Case base types for business logic encapsulation
 */

// Event Bus
export { EventBus, appEventBus } from './events/EventBus';
export type { IEventBus, EventHandler, AppEvents } from './events/EventBus';

// Repository Interfaces
export type { IProjectRepository } from './repositories/IProjectRepository';

// Use Case Types
export type { UseCase, UseCaseNoInput, UseCaseNoOutput, UseCaseResult } from './use-cases/UseCase';
export { success, failure } from './use-cases/UseCase';
