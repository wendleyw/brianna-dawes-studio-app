/**
 * Project Broadcast Channel
 *
 * Enables communication between different contexts (panel & modal)
 * Uses the BroadcastChannel Web API for cross-iframe messaging
 */
import { createLogger } from './logger';

const logger = createLogger('ProjectBroadcast');
const CHANNEL_NAME = 'brianna-dawes-projects';

export type ProjectBroadcastMessage =
  | { type: 'PROJECT_UPDATED'; projectId: string; status?: string }
  | { type: 'PROJECT_CREATED'; projectId: string }
  | { type: 'PROJECT_DELETED'; projectId: string }
  | { type: 'PROJECTS_CHANGED' };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel {
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
  return channel;
}

/**
 * Broadcast a project change event to all listening contexts
 */
export function broadcastProjectChange(message: ProjectBroadcastMessage): void {
  try {
    const ch = getChannel();
    ch.postMessage(message);
    logger.debug('Sent', message);
  } catch (error) {
    logger.warn('Failed to broadcast', error);
  }
}

/**
 * Subscribe to project change events
 * Returns an unsubscribe function
 */
export function onProjectChange(callback: (message: ProjectBroadcastMessage) => void): () => void {
  const ch = getChannel();

  const handler = (event: MessageEvent<ProjectBroadcastMessage>) => {
    logger.debug('Received', event.data);
    callback(event.data);
  };

  ch.addEventListener('message', handler);

  return () => {
    ch.removeEventListener('message', handler);
  };
}

