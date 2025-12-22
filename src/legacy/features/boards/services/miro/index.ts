/**
 * Miro Services - Unified Export
 *
 * This module provides a single entry point for all Miro-related functionality.
 * It consolidates multiple services and eliminates duplicate code.
 *
 * Architecture:
 * - SDK Layer (window.miro): Real-time board operations when running inside Miro
 * - REST API Layer: External operations and when not in Miro context
 *
 * Usage:
 * ```typescript
 * import { miro } from '@features/boards/services/miro';
 *
 * // SDK operations
 * if (miro.isAvailable()) {
 *   await miro.sdk.createFrame({ ... });
 * }
 *
 * // REST API operations
 * await miro.api.getBoard(boardId);
 *
 * // Timeline operations
 * await miro.timeline.syncProject(project);
 *
 * // Rate-limited operations
 * await miro.withRateLimit(() => miro.api.createCard(boardId, data));
 * ```
 */

// Re-export from miroAdapter (SDK layer)
export { miroAdapter } from '@shared/lib/miroAdapter';

// Re-export from miroClient (REST API layer)
export { miroClient } from '../miroClient';

// Re-export rate limiter
export { miroRateLimiter, withRateLimit, batchWithRateLimit } from '@shared/lib/miroRateLimiter';

// Re-export cross-tab sync lock
export { crossTabSyncLock, LOCK_NAMES } from '@shared/lib/crossTabSyncLock';

// Re-export timeline services
export { miroTimelineService, miroProjectRowService } from '../miroSdkService';

// Re-export notifications
export { MiroNotifications, showMiroInfo, showMiroError } from '@shared/lib/miroNotifications';

// Re-export helpers (consolidated)
export {
  findTimelineFrame,
  getTimelineStatus,
  getProjectType,
  isMiroAvailable,
  safeRemove,
} from '../miroHelpers';

// Re-export report services
export { miroReportService } from '../miroReportService';
export { miroClientReportService } from '../miroClientReportService';

// Re-export orchestrator
export { projectSyncOrchestrator } from '../projectSyncOrchestrator';

// Re-export master board service
export { masterBoardService } from '../masterBoardService';

// Re-export brand workspace service
export { brandWorkspaceService } from '../brandWorkspaceService';

// Re-export sync log service
export { syncLogService } from '../syncLogService';
export type { SyncLogEntry, SyncOperation, SyncStatus, ErrorCategory } from '../syncLogService';

// Types (from domain)
export type { MiroBoard, MiroFrame, MiroCard } from '../../domain/board.types';
