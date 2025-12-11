/**
 * Cross-Tab Sync Lock
 *
 * Prevents concurrent Miro sync operations across multiple browser tabs.
 * Uses localStorage with heartbeat mechanism for distributed locking.
 *
 * Features:
 * - Prevents duplicate sync operations
 * - Auto-releases stale locks (tab closed without cleanup)
 * - Provides lock status observability
 * - Safe cleanup on page unload
 */

import { createLogger } from './logger';

const logger = createLogger('CrossTabSyncLock');

// Configuration
const CONFIG = {
  // Prefix for localStorage keys
  keyPrefix: 'miro_sync_lock_',

  // How often to update the heartbeat
  heartbeatIntervalMs: 1000,

  // Lock is considered stale if heartbeat is older than this
  staleLockThresholdMs: 5000,

  // Max time to wait when acquiring a lock
  acquireTimeoutMs: 30000,

  // How often to check for lock acquisition
  acquireRetryIntervalMs: 100,
} as const;

// Lock state
interface LockState {
  tabId: string;
  timestamp: number;
  operation: string;
  heartbeat: number;
}

// Active locks held by this tab
const activeLocks = new Map<string, {
  heartbeatTimer: ReturnType<typeof setInterval>;
  operation: string;
}>();

// Generate unique tab ID
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

/**
 * Get the localStorage key for a lock
 */
function getLockKey(lockName: string): string {
  return `${CONFIG.keyPrefix}${lockName}`;
}

/**
 * Read lock state from localStorage
 */
function readLock(lockName: string): LockState | null {
  try {
    const key = getLockKey(lockName);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as LockState;
  } catch {
    return null;
  }
}

/**
 * Write lock state to localStorage
 */
function writeLock(lockName: string, state: LockState): void {
  try {
    const key = getLockKey(lockName);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    logger.error('Failed to write lock', { lockName, error });
  }
}

/**
 * Remove lock from localStorage
 */
function removeLock(lockName: string): void {
  try {
    const key = getLockKey(lockName);
    localStorage.removeItem(key);
  } catch (error) {
    logger.error('Failed to remove lock', { lockName, error });
  }
}

/**
 * Check if a lock is stale (tab that held it might have crashed)
 */
function isLockStale(lock: LockState): boolean {
  const now = Date.now();
  return now - lock.heartbeat > CONFIG.staleLockThresholdMs;
}

/**
 * Check if we own a lock
 */
function isOurLock(lock: LockState): boolean {
  return lock.tabId === TAB_ID;
}

/**
 * Update the heartbeat for a lock we own
 */
function updateHeartbeat(lockName: string): void {
  const lock = readLock(lockName);
  if (lock && isOurLock(lock)) {
    lock.heartbeat = Date.now();
    writeLock(lockName, lock);
  }
}

/**
 * Acquire a lock (non-blocking)
 *
 * @param lockName - Unique name for the lock
 * @param operation - Description of the operation (for debugging)
 * @returns true if lock was acquired, false otherwise
 */
export function tryAcquireLock(lockName: string, operation: string): boolean {
  const existingLock = readLock(lockName);

  // Check if there's an existing valid lock
  if (existingLock) {
    if (isOurLock(existingLock)) {
      // We already have the lock
      logger.debug('Already have lock', { lockName, operation });
      return true;
    }

    if (!isLockStale(existingLock)) {
      // Another tab has a valid lock
      logger.debug('Lock held by another tab', {
        lockName,
        operation,
        holder: existingLock.tabId,
        holderOperation: existingLock.operation,
      });
      return false;
    }

    // Lock is stale, we can take it
    logger.info('Taking over stale lock', {
      lockName,
      staleLockFrom: existingLock.tabId,
    });
  }

  // Create the lock
  const now = Date.now();
  const newLock: LockState = {
    tabId: TAB_ID,
    timestamp: now,
    operation,
    heartbeat: now,
  };

  writeLock(lockName, newLock);

  // Verify we got the lock (handle race condition)
  const verifyLock = readLock(lockName);
  if (!verifyLock || !isOurLock(verifyLock)) {
    logger.debug('Lost lock race', { lockName });
    return false;
  }

  // Start heartbeat
  const heartbeatTimer = setInterval(() => {
    updateHeartbeat(lockName);
  }, CONFIG.heartbeatIntervalMs);

  activeLocks.set(lockName, { heartbeatTimer, operation });

  logger.info('Lock acquired', { lockName, operation, tabId: TAB_ID });
  return true;
}

/**
 * Acquire a lock (blocking with timeout)
 *
 * @param lockName - Unique name for the lock
 * @param operation - Description of the operation
 * @param timeoutMs - Max time to wait (default: 30s)
 * @returns true if lock was acquired, false if timeout
 */
export async function acquireLock(
  lockName: string,
  operation: string,
  timeoutMs: number = CONFIG.acquireTimeoutMs
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (tryAcquireLock(lockName, operation)) {
      return true;
    }

    // Wait before retrying
    await new Promise(resolve =>
      setTimeout(resolve, CONFIG.acquireRetryIntervalMs)
    );
  }

  logger.warn('Lock acquisition timeout', { lockName, operation, timeoutMs });
  return false;
}

/**
 * Release a lock
 *
 * @param lockName - The lock to release
 * @returns true if lock was released, false if we didn't hold it
 */
export function releaseLock(lockName: string): boolean {
  const lock = readLock(lockName);

  if (!lock) {
    logger.debug('Lock already released', { lockName });
    return true;
  }

  if (!isOurLock(lock)) {
    logger.warn('Cannot release lock we do not own', {
      lockName,
      owner: lock.tabId,
      us: TAB_ID,
    });
    return false;
  }

  // Stop heartbeat
  const activeLock = activeLocks.get(lockName);
  if (activeLock) {
    clearInterval(activeLock.heartbeatTimer);
    activeLocks.delete(lockName);
  }

  // Remove the lock
  removeLock(lockName);

  logger.info('Lock released', { lockName });
  return true;
}

/**
 * Check if a lock is currently held (by any tab)
 */
export function isLocked(lockName: string): boolean {
  const lock = readLock(lockName);
  return lock !== null && !isLockStale(lock);
}

/**
 * Get information about a lock
 */
export function getLockInfo(lockName: string): {
  isLocked: boolean;
  isOurs: boolean;
  holder?: string;
  operation?: string;
  age?: number;
} | null {
  const lock = readLock(lockName);

  if (!lock || isLockStale(lock)) {
    return { isLocked: false, isOurs: false };
  }

  return {
    isLocked: true,
    isOurs: isOurLock(lock),
    holder: lock.tabId,
    operation: lock.operation,
    age: Date.now() - lock.timestamp,
  };
}

/**
 * Execute a function while holding a lock
 *
 * @param lockName - The lock to acquire
 * @param operation - Description of the operation
 * @param fn - The function to execute
 * @param options - Configuration options
 * @returns The result of the function, or throws if lock cannot be acquired
 */
export async function withLock<T>(
  lockName: string,
  operation: string,
  fn: () => Promise<T>,
  options: {
    timeoutMs?: number;
    throwOnTimeout?: boolean;
  } = {}
): Promise<T> {
  const { timeoutMs = CONFIG.acquireTimeoutMs, throwOnTimeout = true } = options;

  const acquired = await acquireLock(lockName, operation, timeoutMs);

  if (!acquired) {
    if (throwOnTimeout) {
      throw new Error(`Failed to acquire lock "${lockName}" for operation "${operation}"`);
    }
    logger.warn('Proceeding without lock', { lockName, operation });
  }

  try {
    return await fn();
  } finally {
    if (acquired) {
      releaseLock(lockName);
    }
  }
}

/**
 * Cleanup all locks held by this tab
 */
function cleanupAllLocks(): void {
  for (const [lockName, { heartbeatTimer }] of activeLocks) {
    clearInterval(heartbeatTimer);
    removeLock(lockName);
    logger.debug('Cleaned up lock on unload', { lockName });
  }
  activeLocks.clear();
}

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupAllLocks);
  window.addEventListener('unload', cleanupAllLocks);

  // Also listen for visibilitychange to handle mobile browsers
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // Update heartbeats one more time before potential suspension
      for (const lockName of activeLocks.keys()) {
        updateHeartbeat(lockName);
      }
    }
  });
}

// Predefined lock names for common operations
export const LOCK_NAMES = {
  // Main board sync lock
  BOARD_SYNC: 'board_sync',

  // Project-specific sync locks (use with project ID)
  PROJECT_SYNC: (projectId: string) => `project_sync_${projectId}`,

  // Master board sync
  MASTER_BOARD_SYNC: 'master_board_sync',

  // Deliverable sync
  DELIVERABLE_SYNC: (deliverableId: string) => `deliverable_sync_${deliverableId}`,
} as const;

export const crossTabSyncLock = {
  tryAcquireLock,
  acquireLock,
  releaseLock,
  isLocked,
  getLockInfo,
  withLock,
  LOCK_NAMES,
  TAB_ID,
};
