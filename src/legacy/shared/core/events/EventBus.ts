/**
 * Event Bus - Pub/Sub system for decoupled communication between modules
 *
 * This implements the Observer pattern to allow modules to communicate
 * without direct dependencies. Features:
 * - Type-safe event definitions
 * - Async event handlers
 * - Error isolation (one handler failure doesn't affect others)
 * - Automatic cleanup via unsubscribe
 *
 * @example
 * ```typescript
 * // Define events
 * interface AppEvents {
 *   'project:created': { project: Project };
 *   'project:updated': { project: Project; changes: string[] };
 *   'project:deleted': { projectId: string };
 * }
 *
 * // Subscribe to events
 * const unsubscribe = eventBus.on('project:created', async ({ project }) => {
 *   await miroSyncService.syncProject(project);
 * });
 *
 * // Emit events
 * await eventBus.emit('project:created', { project });
 *
 * // Cleanup
 * unsubscribe();
 * ```
 */

import { createLogger } from '@shared/lib/logger';

const logger = createLogger('EventBus');

export type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

export interface IEventBus<TEvents extends Record<string, unknown>> {
  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void;

  /**
   * Subscribe to an event (only triggers once)
   */
  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void;

  /**
   * Emit an event to all subscribers
   * Handlers are called in parallel, errors are isolated
   */
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): Promise<void>;

  /**
   * Remove all handlers for an event (or all events if no event specified)
   */
  off<K extends keyof TEvents>(event?: K): void;
}

/**
 * Generic Event Bus implementation
 */
export class EventBus<TEvents extends Record<string, unknown>> implements IEventBus<TEvents> {
  private handlers = new Map<keyof TEvents, Set<EventHandler<unknown>>>();

  on<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }

    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler as EventHandler<unknown>);

    logger.debug(`Subscribed to event: ${String(event)}`, {
      handlerCount: eventHandlers.size
    });

    // Return unsubscribe function
    return () => {
      eventHandlers.delete(handler as EventHandler<unknown>);
      logger.debug(`Unsubscribed from event: ${String(event)}`, {
        handlerCount: eventHandlers.size
      });
    };
  }

  once<K extends keyof TEvents>(event: K, handler: EventHandler<TEvents[K]>): () => void {
    const wrappedHandler: EventHandler<TEvents[K]> = async (payload) => {
      unsubscribe();
      await handler(payload);
    };

    const unsubscribe = this.on(event, wrappedHandler);
    return unsubscribe;
  }

  async emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): Promise<void> {
    const eventHandlers = this.handlers.get(event);

    if (!eventHandlers || eventHandlers.size === 0) {
      logger.debug(`No handlers for event: ${String(event)}`);
      return;
    }

    logger.debug(`Emitting event: ${String(event)}`, {
      handlerCount: eventHandlers.size
    });

    // Execute all handlers in parallel, catching errors individually
    const results = await Promise.allSettled(
      Array.from(eventHandlers).map(async (handler) => {
        try {
          await handler(payload);
        } catch (error) {
          logger.error(`Handler error for event: ${String(event)}`, error);
          throw error;
        }
      })
    );

    // Log any failures
    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      logger.warn(`${failures.length} handler(s) failed for event: ${String(event)}`);
    }
  }

  off<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.handlers.delete(event);
      logger.debug(`Removed all handlers for event: ${String(event)}`);
    } else {
      this.handlers.clear();
      logger.debug('Removed all event handlers');
    }
  }

  /**
   * Get the number of handlers for an event
   */
  getHandlerCount<K extends keyof TEvents>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

// ============================================================================
// Application Events
// ============================================================================

import type { Project } from '@features/projects/domain/project.types';

/**
 * All application events with their payload types
 */
export interface AppEvents {
  // Project events
  'project:created': { project: Project };
  'project:updated': { project: Project; previousStatus?: string };
  'project:deleted': { projectId: string };
  'project:archived': { project: Project };
  'project:status-changed': { project: Project; previousStatus: string; newStatus: string };

  // Sync events
  'sync:started': { projectId: string };
  'sync:completed': { projectId: string; miroCardId?: string | undefined };
  'sync:failed': { projectId: string; error: string; retryCount: number };

  // Auth events
  'auth:login': { userId: string; role: string };
  'auth:logout': { userId: string };
  'auth:role-changed': { userId: string; previousRole: string; newRole: string };
}

/**
 * Singleton instance of the application event bus
 * Note: Using type assertion to satisfy Record constraint while maintaining type safety
 */
export const appEventBus = new EventBus<AppEvents & Record<string, unknown>>();
