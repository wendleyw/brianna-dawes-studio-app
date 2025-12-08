/**
 * Miro SDK Adapter
 *
 * Unified adapter for all Miro SDK operations.
 * Centralizes SDK access, error handling, and initialization checks.
 *
 * This adapter provides:
 * - Single point of access to window.miro
 * - Consistent error handling
 * - Initialization state tracking
 * - Type-safe SDK operations
 *
 * @example
 * ```typescript
 * import { miroAdapter } from '@shared/lib/miroAdapter';
 *
 * // Check if running in Miro
 * if (miroAdapter.isAvailable()) {
 *   const miro = miroAdapter.getSDK();
 *   await miro.board.get({ type: 'frame' });
 * }
 * ```
 */

import { createLogger } from './logger';

const logger = createLogger('MiroAdapter');

// SDK initialization states
type MiroSDKState = 'not_checked' | 'available' | 'unavailable';

interface MiroSDKInfo {
  state: MiroSDKState;
  lastChecked: number;
  initializationAttempts: number;
  lastError: Error | null;
}

class MiroAdapter {
  private sdkInfo: MiroSDKInfo = {
    state: 'not_checked',
    lastChecked: 0,
    initializationAttempts: 0,
    lastError: null,
  };

  // Cache duration for SDK availability check (5 seconds)
  private readonly CACHE_DURATION_MS = 5000;
  // Max wait time for SDK initialization (10 seconds)
  private readonly MAX_WAIT_TIME_MS = 10000;
  // Check interval during wait (100ms)
  private readonly CHECK_INTERVAL_MS = 100;

  /**
   * Check if Miro SDK is available (with caching)
   */
  isAvailable(): boolean {
    const now = Date.now();

    // Return cached result if recent
    if (
      this.sdkInfo.state !== 'not_checked' &&
      now - this.sdkInfo.lastChecked < this.CACHE_DURATION_MS
    ) {
      return this.sdkInfo.state === 'available';
    }

    // Check SDK availability
    const available = typeof window !== 'undefined' && window.miro !== undefined;

    this.sdkInfo = {
      ...this.sdkInfo,
      state: available ? 'available' : 'unavailable',
      lastChecked: now,
    };

    return available;
  }

  /**
   * Check if we're running inside a Miro board context
   */
  isInMiro(): boolean {
    return this.isAvailable();
  }

  /**
   * Get the Miro SDK instance
   * @throws Error if SDK is not available
   */
  getSDK(): typeof window.miro {
    if (!this.isAvailable()) {
      const error = new Error(
        'Miro SDK not available. Make sure you are running inside a Miro board.'
      );
      this.sdkInfo.lastError = error;
      logger.error('SDK access failed - not in Miro context');
      throw error;
    }

    return window.miro;
  }

  /**
   * Safely get SDK or return null if not available
   * Use this when SDK operations are optional
   */
  getSDKOrNull(): typeof window.miro | null {
    try {
      return this.getSDK();
    } catch {
      return null;
    }
  }

  /**
   * Wait for Miro SDK to become available
   * Useful during app initialization
   */
  async waitForSDK(timeoutMs: number = this.MAX_WAIT_TIME_MS): Promise<typeof window.miro> {
    const startTime = Date.now();
    this.sdkInfo.initializationAttempts++;

    logger.debug('Waiting for Miro SDK...', { timeout: timeoutMs });

    while (Date.now() - startTime < timeoutMs) {
      if (this.isAvailable()) {
        logger.debug('Miro SDK became available', {
          waitTime: Date.now() - startTime,
        });
        return this.getSDK();
      }
      await this.sleep(this.CHECK_INTERVAL_MS);
    }

    const error = new Error(`Miro SDK not available after ${timeoutMs}ms timeout`);
    this.sdkInfo.lastError = error;
    logger.error('SDK wait timeout', { timeoutMs, attempts: this.sdkInfo.initializationAttempts });
    throw error;
  }

  /**
   * Execute a function with the Miro SDK, handling errors consistently
   */
  async withSDK<T>(fn: (miro: typeof window.miro) => Promise<T>): Promise<T> {
    const miro = this.getSDK();
    try {
      return await fn(miro);
    } catch (error) {
      this.sdkInfo.lastError = error instanceof Error ? error : new Error(String(error));
      logger.error('SDK operation failed', error);
      throw error;
    }
  }

  /**
   * Execute a function with the Miro SDK, returning null on any error
   * Use for non-critical operations that shouldn't throw
   */
  async withSDKOrNull<T>(fn: (miro: typeof window.miro) => Promise<T>): Promise<T | null> {
    try {
      return await this.withSDK(fn);
    } catch {
      return null;
    }
  }

  /**
   * Get the last error that occurred during SDK operations
   */
  getLastError(): Error | null {
    return this.sdkInfo.lastError;
  }

  /**
   * Get SDK state information for debugging
   */
  getInfo(): Readonly<MiroSDKInfo> {
    return { ...this.sdkInfo };
  }

  /**
   * Reset SDK state (useful for testing or reconnection)
   */
  reset(): void {
    this.sdkInfo = {
      state: 'not_checked',
      lastChecked: 0,
      initializationAttempts: 0,
      lastError: null,
    };
    logger.debug('MiroAdapter state reset');
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Get board items by type
   */
  async getBoardItems<T>(type: string): Promise<T[]> {
    return this.withSDK(async (miro) => {
      return (await miro.board.get({ type })) as T[];
    });
  }

  /**
   * Create a frame on the board
   */
  async createFrame(options: {
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    style?: { fillColor?: string };
  }): Promise<unknown> {
    return this.withSDK(async (miro) => {
      return await miro.board.createFrame(options);
    });
  }

  /**
   * Create a card on the board
   */
  async createCard(options: {
    title: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
    style?: { cardTheme?: string };
  }): Promise<unknown> {
    return this.withSDK(async (miro) => {
      return await miro.board.createCard(options);
    });
  }

  /**
   * Remove an item from the board
   */
  async removeItem(id: string): Promise<boolean> {
    try {
      await this.withSDK(async (miro) => {
        await miro.board.remove({ id });
      });
      return true;
    } catch (error) {
      logger.warn(`Failed to remove item ${id}`, error);
      return false;
    }
  }

  /**
   * Zoom to specific items
   * Note: Requires passing full MiroItem objects with type, x, y properties
   */
  async zoomToItems(items: unknown[]): Promise<void> {
    await this.withSDK(async (miro) => {
      // Cast to any to bypass strict typing - Miro SDK accepts partial items
      await miro.board.viewport.zoomTo(items as Parameters<typeof miro.board.viewport.zoomTo>[0]);
    });
  }

  /**
   * Show info notification in Miro
   */
  async showInfo(message: string): Promise<void> {
    await this.withSDK(async (miro) => {
      await miro.board.notifications.showInfo(message);
    });
  }

  /**
   * Show error notification in Miro
   */
  async showError(message: string): Promise<void> {
    await this.withSDK(async (miro) => {
      await miro.board.notifications.showError(message);
    });
  }

  /**
   * Get current board info
   */
  async getBoardInfo(): Promise<{ id: string } | null> {
    return this.withSDKOrNull(async (miro) => {
      const info = await miro.board.getInfo();
      return { id: info.id };
    });
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<{ id: string; name: string } | null> {
    return this.withSDKOrNull(async (miro) => {
      const user = await miro.board.getUserInfo();
      return { id: user.id, name: user.name };
    });
  }

  // Private helper
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const miroAdapter = new MiroAdapter();

// Export type for SDK
export type MiroSDK = typeof window.miro;

// Legacy export for backward compatibility - DEPRECATED
// Use miroAdapter.getSDK() instead
export function getMiroSDK(): typeof window.miro {
  return miroAdapter.getSDK();
}
