/**
 * Miro Board Notifications Helper
 *
 * Centralized helper for showing notifications on the Miro board.
 * Only works when the app is running inside Miro.
 */

import { createLogger } from './logger';

const logger = createLogger('MiroNotifications');

/**
 * Check if we're running inside Miro
 */
function isInMiro(): boolean {
  return typeof window !== 'undefined' && !!window.miro;
}

/**
 * Show an info notification on the Miro board
 */
export async function showMiroInfo(message: string): Promise<void> {
  if (!isInMiro()) {
    logger.debug('Not in Miro, skipping notification:', message);
    return;
  }

  try {
    await window.miro.board.notifications.showInfo(message);
    logger.debug('Miro info notification shown:', message);
  } catch (err) {
    logger.warn('Failed to show Miro info notification:', err);
  }
}

/**
 * Show an error notification on the Miro board
 */
export async function showMiroError(message: string): Promise<void> {
  if (!isInMiro()) {
    logger.debug('Not in Miro, skipping error notification:', message);
    return;
  }

  try {
    await window.miro.board.notifications.showError(message);
    logger.debug('Miro error notification shown:', message);
  } catch (err) {
    logger.warn('Failed to show Miro error notification:', err);
  }
}

/**
 * Pre-defined notification messages for common actions
 */
export const MiroNotifications = {
  // Project actions
  projectCreated: (name: string) => showMiroInfo(`Project "${name}" created successfully!`),
  projectUpdated: (name: string) => showMiroInfo(`Project "${name}" updated`),
  projectDeleted: (name: string) => showMiroInfo(`Project "${name}" deleted`),
  projectStatusChanged: (name: string, status: string) =>
    showMiroInfo(`"${name}" moved to ${status.toUpperCase()}`),

  // Sync actions
  syncStarted: () => showMiroInfo('Syncing with Miro board...'),
  syncCompleted: () => showMiroInfo('Sync completed'),
  syncError: (error?: string) => showMiroError(error || 'Sync failed. Please try again.'),

  // Board actions
  boardInitialized: () => showMiroInfo('Project board initialized'),
  briefingCreated: (name: string) => showMiroInfo(`Briefing frame created for "${name}"`),

  // Errors
  error: (message: string) => showMiroError(message),
};
