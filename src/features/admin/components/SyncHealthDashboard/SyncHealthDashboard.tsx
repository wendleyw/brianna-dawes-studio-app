/**
 * Sync Health Dashboard Component
 *
 * Displays real-time metrics about Miro ↔ Supabase synchronization health.
 * Shows:
 * - Sync success rate
 * - Projects by sync status (synced, pending, error)
 * - Recent sync errors
 * - Retry controls
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@shared/ui';
import { projectSyncOrchestrator } from '@features/boards/services';
import { createLogger } from '@shared/lib/logger';
import styles from './SyncHealthDashboard.module.css';

const logger = createLogger('SyncHealthDashboard');

interface SyncHealthMetrics {
  totalProjects: number;
  syncedCount: number;
  pendingCount: number;
  errorCount: number;
  syncingCount: number;
  syncSuccessRate: number;
  avgRetryCount: number;
  lastSyncError: string | null;
  lastErrorProjectName: string | null;
  miroAvailable: boolean;
}

export function SyncHealthDashboard() {
  const [metrics, setMetrics] = useState<SyncHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResults, setRetryResults] = useState<{
    attempted: number;
    succeeded: number;
    failed: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const health = await projectSyncOrchestrator.getSyncHealth();
      setMetrics(health);
      setError(null);
    } catch (err) {
      logger.error('Failed to fetch sync health', err);
      setError('Failed to load sync health metrics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const handleRetryFailed = async () => {
    setIsRetrying(true);
    setRetryResults(null);
    try {
      const results = await projectSyncOrchestrator.retryFailedSyncs();
      setRetryResults({
        attempted: results.attempted,
        succeeded: results.succeeded,
        failed: results.failed,
      });
      // Refresh metrics after retry
      await fetchMetrics();
    } catch (err) {
      logger.error('Failed to retry syncs', err);
      setError('Failed to retry sync operations');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'synced':
        return '#22C55E'; // Green
      case 'pending':
        return '#F59E0B'; // Yellow
      case 'syncing':
        return '#3B82F6'; // Blue
      case 'sync_error':
        return '#EF4444'; // Red
      default:
        return '#6B7280'; // Gray
    }
  };

  const getHealthStatus = (): { label: string; color: string } => {
    if (!metrics) return { label: 'Unknown', color: '#6B7280' };

    if (metrics.errorCount > 0) {
      return { label: 'Needs Attention', color: '#EF4444' };
    }
    if (metrics.pendingCount > 0 || metrics.syncingCount > 0) {
      return { label: 'Syncing', color: '#F59E0B' };
    }
    if (metrics.syncSuccessRate === 100) {
      return { label: 'Healthy', color: '#22C55E' };
    }
    return { label: 'Good', color: '#84CC16' };
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading sync health...</div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
        <Button onClick={fetchMetrics} variant="secondary" size="sm">
          Retry
        </Button>
      </div>
    );
  }

  const healthStatus = getHealthStatus();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Sync Health</h3>
        <div
          className={styles.statusBadge}
          style={{ backgroundColor: healthStatus.color }}
        >
          {healthStatus.label}
        </div>
      </div>

      {/* Miro Connection Status */}
      <div className={styles.connectionStatus}>
        <span className={styles.connectionLabel}>Miro Connection:</span>
        <span
          className={styles.connectionIndicator}
          style={{
            backgroundColor: metrics?.miroAvailable ? '#22C55E' : '#EF4444',
          }}
        />
        <span>{metrics?.miroAvailable ? 'Connected' : 'Not Available'}</span>
      </div>

      {/* Success Rate */}
      <div className={styles.successRate}>
        <div className={styles.rateValue}>
          {metrics?.syncSuccessRate.toFixed(0)}%
        </div>
        <div className={styles.rateLabel}>Sync Success Rate</div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${metrics?.syncSuccessRate || 0}%`,
              backgroundColor:
                (metrics?.syncSuccessRate || 0) >= 90
                  ? '#22C55E'
                  : (metrics?.syncSuccessRate || 0) >= 70
                  ? '#F59E0B'
                  : '#EF4444',
            }}
          />
        </div>
      </div>

      {/* Status Breakdown */}
      <div className={styles.statusBreakdown}>
        <div className={styles.statusItem}>
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor('synced') }}
          />
          <span className={styles.statusLabel}>Synced</span>
          <span className={styles.statusCount}>{metrics?.syncedCount || 0}</span>
        </div>
        <div className={styles.statusItem}>
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor('pending') }}
          />
          <span className={styles.statusLabel}>Pending</span>
          <span className={styles.statusCount}>{metrics?.pendingCount || 0}</span>
        </div>
        <div className={styles.statusItem}>
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor('syncing') }}
          />
          <span className={styles.statusLabel}>Syncing</span>
          <span className={styles.statusCount}>{metrics?.syncingCount || 0}</span>
        </div>
        <div className={styles.statusItem}>
          <div
            className={styles.statusDot}
            style={{ backgroundColor: getStatusColor('sync_error') }}
          />
          <span className={styles.statusLabel}>Errors</span>
          <span className={styles.statusCount}>{metrics?.errorCount || 0}</span>
        </div>
      </div>

      {/* Error Details */}
      {metrics?.errorCount && metrics.errorCount > 0 && (
        <div className={styles.errorSection}>
          <div className={styles.errorTitle}>Recent Sync Error</div>
          {metrics.lastErrorProjectName && (
            <div className={styles.errorProject}>
              Project: {metrics.lastErrorProjectName}
            </div>
          )}
          {metrics.lastSyncError && (
            <div className={styles.errorMessage}>{metrics.lastSyncError}</div>
          )}
          {metrics.avgRetryCount > 0 && (
            <div className={styles.retryInfo}>
              Avg. retry attempts: {metrics.avgRetryCount.toFixed(1)}
            </div>
          )}
        </div>
      )}

      {/* Retry Results */}
      {retryResults && (
        <div className={styles.retryResults}>
          <div className={styles.retryTitle}>Retry Results</div>
          <div className={styles.retryStats}>
            <span>Attempted: {retryResults.attempted}</span>
            <span style={{ color: '#22C55E' }}>
              Succeeded: {retryResults.succeeded}
            </span>
            <span style={{ color: '#EF4444' }}>
              Failed: {retryResults.failed}
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <Button
          onClick={handleRetryFailed}
          variant="secondary"
          size="sm"
          disabled={
            isRetrying ||
            !metrics?.miroAvailable ||
            (metrics?.errorCount === 0 && metrics?.pendingCount === 0)
          }
        >
          {isRetrying ? 'Retrying...' : 'Retry Failed Syncs'}
        </Button>
        <Button onClick={fetchMetrics} variant="ghost" size="sm">
          Refresh
        </Button>
      </div>

      {/* Total Projects */}
      <div className={styles.totalProjects}>
        Total Projects: {metrics?.totalProjects || 0}
      </div>
    </div>
  );
}
