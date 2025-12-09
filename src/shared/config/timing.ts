/**
 * Timing Constants
 *
 * Centralized timing values used across the application.
 * Extract magic numbers here for consistency and easier tuning.
 */

/**
 * Sync-related timing constants
 */
export const SYNC_TIMING = {
  /** Cooldown after sync to prevent re-syncing (ms) */
  RECENT_SYNC_COOLDOWN: 5000,
  /** Timeout for sync operations (ms) */
  OPERATION_TIMEOUT: 30000,
  /** Delay between batch operations to avoid rate limiting (ms) */
  BATCH_DELAY: 500,
} as const;

/**
 * UI-related timing constants
 */
export const UI_TIMING = {
  /** Toast dismiss animation duration (ms) */
  TOAST_DISMISS_ANIMATION: 200,
  /** Default toast display duration (ms) */
  TOAST_DURATION: 5000,
  /** Scroll into view delay after load (ms) */
  SCROLL_DELAY: 100,
  /** URL param clear delay after scroll (ms) */
  URL_CLEAR_DELAY: 1500,
  /** Search input debounce delay (ms) */
  SEARCH_DEBOUNCE: 300,
  /** Filter input debounce delay (ms) */
  FILTER_DEBOUNCE: 300,
} as const;

/**
 * Polling and refresh intervals
 */
export const POLLING_INTERVALS = {
  /** Sync health dashboard refresh (ms) */
  HEALTH_CHECK: 30000,
  /** Realtime reconnection delay (ms) */
  RECONNECT_DELAY: 1000,
} as const;
