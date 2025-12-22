/**
 * Sync Log Service
 *
 * Tracks Miro synchronization operations with detailed status, timing,
 * and error information. Uses the sync_logs table for persistence.
 *
 * Features:
 * - Automatic timing tracking (started_at, completed_at, duration_ms)
 * - Error categorization for debugging
 * - Miro item tracking (created, updated, deleted)
 * - Retry tracking
 */

import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('SyncLog');

// Sync operation types
export type SyncOperation = 'create' | 'update' | 'delete' | 'sync';

// Sync status types
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error' | 'rolled_back';

// Error categories for debugging
export type ErrorCategory =
  | 'network'
  | 'rate_limit'
  | 'authentication'
  | 'validation'
  | 'miro_api'
  | 'database'
  | 'timeout'
  | 'unknown';

// Sync log entry
export interface SyncLogEntry {
  id: string;
  projectId: string | null;
  operation: SyncOperation;
  status: SyncStatus;
  miroItemsCreated: string[];
  miroItemsUpdated: string[];
  miroItemsDeleted: string[];
  errorMessage: string | null;
  errorCategory: ErrorCategory | null;
  retryCount: number;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  createdAt: string;
}

// Create sync log input
export interface CreateSyncLogInput {
  projectId?: string;
  operation: SyncOperation;
}

// Complete sync log input
export interface CompleteSyncLogInput {
  status: SyncStatus;
  miroItemsCreated?: string[] | undefined;
  miroItemsUpdated?: string[] | undefined;
  miroItemsDeleted?: string[] | undefined;
  errorMessage?: string | undefined;
  errorCategory?: ErrorCategory | undefined;
}

/**
 * Categorize an error for logging
 */
function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return 'network';
    }
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return 'rate_limit';
    }
    if (message.includes('auth') || message.includes('401') || message.includes('403') || message.includes('unauthorized')) {
      return 'authentication';
    }
    if (message.includes('valid') || message.includes('required') || message.includes('invalid')) {
      return 'validation';
    }
    if (message.includes('miro') || message.includes('board') || message.includes('frame') || message.includes('card')) {
      return 'miro_api';
    }
    if (message.includes('database') || message.includes('supabase') || message.includes('postgres')) {
      return 'database';
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout';
    }
  }

  return 'unknown';
}

/**
 * Sync Log Service
 */
export const syncLogService = {
  /**
   * Start a new sync log entry
   */
  async startSync(input: CreateSyncLogInput): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('create_sync_log', {
        p_project_id: input.projectId || null,
        p_operation: input.operation,
      });

      if (error) {
        logger.error('Failed to create sync log', { error, input });
        return null;
      }

      logger.debug('Sync log started', { syncId: data, input });
      return data as string;
    } catch (error) {
      logger.error('Error creating sync log', error);
      return null;
    }
  },

  /**
   * Complete a sync log entry with results
   */
  async completeSync(syncId: string, result: CompleteSyncLogInput): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('complete_sync_log', {
        p_sync_id: syncId,
        p_status: result.status,
        p_miro_items_created: JSON.stringify(result.miroItemsCreated || []),
        p_miro_items_updated: JSON.stringify(result.miroItemsUpdated || []),
        p_miro_items_deleted: JSON.stringify(result.miroItemsDeleted || []),
        p_error_message: result.errorMessage || null,
        p_error_category: result.errorCategory || null,
      });

      if (error) {
        logger.error('Failed to complete sync log', { error, syncId, result });
        return false;
      }

      logger.debug('Sync log completed', { syncId, status: result.status, success: data });
      return data === true;
    } catch (error) {
      logger.error('Error completing sync log', error);
      return false;
    }
  },

  /**
   * Complete a sync log with an error
   */
  async completeSyncWithError(syncId: string, error: unknown): Promise<boolean> {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCategory = categorizeError(error);

    return this.completeSync(syncId, {
      status: 'error',
      errorMessage,
      errorCategory,
    });
  },

  /**
   * Get recent sync logs for a project
   */
  async getProjectSyncLogs(projectId: string, limit = 10): Promise<SyncLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get project sync logs', { error, projectId });
        return [];
      }

      return (data || []).map(mapDbToSyncLog);
    } catch (error) {
      logger.error('Error getting project sync logs', error);
      return [];
    }
  },

  /**
   * Get recent sync logs (all projects)
   */
  async getRecentSyncLogs(limit = 50): Promise<SyncLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get recent sync logs', { error });
        return [];
      }

      return (data || []).map(mapDbToSyncLog);
    } catch (error) {
      logger.error('Error getting recent sync logs', error);
      return [];
    }
  },

  /**
   * Get failed sync logs for retry
   */
  async getFailedSyncs(limit = 20): Promise<SyncLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('*')
        .eq('status', 'error')
        .lt('retry_count', 3) // Max 3 retries
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Failed to get failed syncs', { error });
        return [];
      }

      return (data || []).map(mapDbToSyncLog);
    } catch (error) {
      logger.error('Error getting failed syncs', error);
      return [];
    }
  },

  /**
   * Increment retry count for a sync log
   */
  async incrementRetryCount(syncId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('sync_logs')
        .update({
          retry_count: supabase.rpc('increment_sync_retry', { sync_id: syncId }),
          status: 'syncing',
        })
        .eq('id', syncId);

      if (error) {
        logger.error('Failed to increment retry count', { error, syncId });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error incrementing retry count', error);
      return false;
    }
  },

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageDurationMs: number;
    syncsByOperation: Record<SyncOperation, number>;
    errorsByCategory: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('sync_logs')
        .select('status, operation, duration_ms, error_category')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (error) {
        logger.error('Failed to get sync stats', { error });
        return {
          totalSyncs: 0,
          successfulSyncs: 0,
          failedSyncs: 0,
          averageDurationMs: 0,
          syncsByOperation: { create: 0, update: 0, delete: 0, sync: 0 },
          errorsByCategory: {},
        };
      }

      const logs = data || [];
      const totalSyncs = logs.length;
      const successfulSyncs = logs.filter(l => l.status === 'success').length;
      const failedSyncs = logs.filter(l => l.status === 'error').length;

      const durations = logs
        .filter(l => l.duration_ms !== null)
        .map(l => l.duration_ms as number);
      const averageDurationMs = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      const syncsByOperation: Record<SyncOperation, number> = {
        create: logs.filter(l => l.operation === 'create').length,
        update: logs.filter(l => l.operation === 'update').length,
        delete: logs.filter(l => l.operation === 'delete').length,
        sync: logs.filter(l => l.operation === 'sync').length,
      };

      const errorsByCategory: Record<string, number> = {};
      for (const log of logs) {
        if (log.error_category) {
          errorsByCategory[log.error_category] = (errorsByCategory[log.error_category] || 0) + 1;
        }
      }

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        averageDurationMs,
        syncsByOperation,
        errorsByCategory,
      };
    } catch (error) {
      logger.error('Error getting sync stats', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        averageDurationMs: 0,
        syncsByOperation: { create: 0, update: 0, delete: 0, sync: 0 },
        errorsByCategory: {},
      };
    }
  },

  /**
   * Helper to wrap an async operation with sync logging
   */
  async withSyncLog<T>(
    input: CreateSyncLogInput,
    operation: () => Promise<{ result: T; miroItems?: { created?: string[]; updated?: string[]; deleted?: string[] } }>
  ): Promise<T> {
    const syncId = await this.startSync(input);

    try {
      const { result, miroItems } = await operation();

      if (syncId) {
        const completionInput: CompleteSyncLogInput = {
          status: 'success',
        };
        if (miroItems?.created) completionInput.miroItemsCreated = miroItems.created;
        if (miroItems?.updated) completionInput.miroItemsUpdated = miroItems.updated;
        if (miroItems?.deleted) completionInput.miroItemsDeleted = miroItems.deleted;

        await this.completeSync(syncId, completionInput);
      }

      return result;
    } catch (error) {
      if (syncId) {
        await this.completeSyncWithError(syncId, error);
      }
      throw error;
    }
  },
};

/**
 * Map database row to SyncLogEntry
 */
function mapDbToSyncLog(row: Record<string, unknown>): SyncLogEntry {
  return {
    id: row.id as string,
    projectId: row.project_id as string | null,
    operation: row.operation as SyncOperation,
    status: row.status as SyncStatus,
    miroItemsCreated: (row.miro_items_created as string[]) || [],
    miroItemsUpdated: (row.miro_items_updated as string[]) || [],
    miroItemsDeleted: (row.miro_items_deleted as string[]) || [],
    errorMessage: row.error_message as string | null,
    errorCategory: row.error_category as ErrorCategory | null,
    retryCount: row.retry_count as number,
    startedAt: row.started_at as string,
    completedAt: row.completed_at as string | null,
    durationMs: row.duration_ms as number | null,
    createdAt: row.created_at as string,
  };
}
