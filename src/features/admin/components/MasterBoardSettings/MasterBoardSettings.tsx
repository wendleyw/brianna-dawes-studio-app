/**
 * Master Board Settings Component
 *
 * Allows admin to configure and sync the Master Board
 * which displays all clients with their projects in a consolidated view.
 *
 * Note: Sync only works when running inside the Master Board in Miro.
 * The SDK can only manipulate the current board.
 */

import { useState, useEffect, memo } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { RefreshIcon, CheckIcon, ExternalLinkIcon } from '@shared/ui/Icons';
import {
  useMasterBoardSettings,
  useMasterBoardSyncStatus,
  useMasterBoardInitialize,
  useMasterBoardSync,
} from '@features/boards/hooks/useMasterBoard';
import { miroAdapter } from '@shared/lib/miroAdapter';
import styles from './MasterBoardSettings.module.css';

export const MasterBoardSettings = memo(function MasterBoardSettings() {
  const [inputBoardId, setInputBoardId] = useState('');
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { boardId, isLoading, saveBoardId, isSaving } = useMasterBoardSettings();
  const { data: syncStatus, isLoading: loadingSyncStatus } = useMasterBoardSyncStatus();
  const initializeMutation = useMasterBoardInitialize();
  const syncMutation = useMasterBoardSync();

  // Initialize input with saved board ID
  useEffect(() => {
    if (boardId) {
      setInputBoardId(boardId);
    }
  }, [boardId]);

  // Get current board ID from Miro SDK
  useEffect(() => {
    const getCurrentBoard = async () => {
      try {
        if (miroAdapter.isAvailable()) {
          const boardInfo = await miroAdapter.getBoardInfo();
          if (boardInfo?.id) {
            setCurrentBoardId(boardInfo.id);
          }
        }
      } catch {
        // Board info not available outside Miro context
      }
    };
    getCurrentBoard();
  }, []);

  const handleSaveBoardId = async () => {
    if (!inputBoardId.trim()) {
      setError('Please enter a board ID');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await saveBoardId(inputBoardId.trim());
      setSuccessMessage('Board ID saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save board ID');
    }
  };

  const handleInitialize = async () => {
    if (!boardId) {
      setError('Board ID required');
      return;
    }

    if (!isCurrentBoardMaster) {
      setError('You must be inside the Master Board to initialize');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      await initializeMutation.mutateAsync({ boardId });
      setSuccessMessage('Master Board initialized successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize board');
    }
  };

  const handleSync = async () => {
    if (!boardId) {
      setError('Board ID required');
      return;
    }

    if (!isCurrentBoardMaster) {
      setError('You must be inside the Master Board to sync');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    try {
      const result = await syncMutation.mutateAsync({ boardId });
      if (result.success) {
        setSuccessMessage(`Synced ${result.clientsProcessed} clients successfully`);
      } else {
        setError(`Sync completed with errors: ${result.errors.join(', ')}`);
      }
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync');
    }
  };

  // Check if we're currently inside the Master Board
  const isCurrentBoardMaster = currentBoardId && boardId && currentBoardId === boardId;
  const isMiroContext = miroAdapter.isAvailable();

  const openBoardInMiro = () => {
    if (boardId) {
      window.open(`https://miro.com/app/board/${boardId}/`, '_blank');
    }
  };

  if (isLoading) {
    return <Skeleton height={200} />;
  }

  const isSyncing = syncMutation.isPending;
  const isInitializing = initializeMutation.isPending;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Master Board</h3>
        <p className={styles.description}>
          Configure a consolidated board that displays all clients with their projects organized by status.
        </p>
      </div>

      {/* Board ID Input */}
      <div className={styles.section}>
        <label className={styles.label}>Miro Board ID</label>
        <div className={styles.inputRow}>
          <Input
            value={inputBoardId}
            onChange={(e) => setInputBoardId(e.target.value)}
            placeholder="Enter Miro board ID (e.g., uXjVN...)"
            className={styles.input}
          />
          <Button
            onClick={handleSaveBoardId}
            disabled={isSaving || !inputBoardId.trim()}
            variant="secondary"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <p className={styles.hint}>
          Create a new board in Miro and paste its ID here. The ID is in the URL after /board/
        </p>
      </div>

      {/* Board Status */}
      {boardId && (
        <div className={styles.section}>
          <div className={styles.statusRow}>
            <span className={styles.statusLabel}>Status:</span>
            {isCurrentBoardMaster ? (
              <span className={styles.statusValid}>
                <CheckIcon size={14} /> You are inside the Master Board - Ready to sync
              </span>
            ) : isMiroContext ? (
              <span className={styles.statusPending}>
                Board ID saved. Open the Master Board to sync.
              </span>
            ) : (
              <span className={styles.statusPending}>
                Board ID saved. Open the app inside the Master Board to sync.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {boardId && (
        <div className={styles.section}>
          <div className={styles.actions}>
            <Button
              onClick={handleInitialize}
              disabled={isInitializing || !isCurrentBoardMaster}
              variant="secondary"
              title={!isCurrentBoardMaster ? 'Open this app inside the Master Board to initialize' : undefined}
            >
              {isInitializing ? 'Initializing...' : 'Initialize Board'}
            </Button>
            <Button
              onClick={handleSync}
              disabled={isSyncing || !isCurrentBoardMaster}
              variant="primary"
              title={!isCurrentBoardMaster ? 'Open this app inside the Master Board to sync' : undefined}
            >
              {isSyncing ? (
                <>
                  <span className={styles.spinning}><RefreshIcon size={14} /></span> Syncing...
                </>
              ) : (
                <>
                  <RefreshIcon size={14} /> Sync All Clients
                </>
              )}
            </Button>
            <Button onClick={openBoardInMiro} variant="ghost">
              <ExternalLinkIcon size={14} /> Open in Miro
            </Button>
          </div>
        </div>
      )}

      {/* Sync Status */}
      {boardId && !loadingSyncStatus && syncStatus?.lastSyncAt && (
        <div className={styles.section}>
          <div className={styles.syncStatus}>
            <h4 className={styles.syncTitle}>Last Sync</h4>
            <div className={styles.syncInfo}>
              <span className={styles.syncTime}>
                {new Date(syncStatus.lastSyncAt).toLocaleString()}
              </span>
              {syncStatus.lastSyncResult && (
                <>
                  <span className={styles.syncClients}>
                    {syncStatus.lastSyncResult.clientsProcessed} clients processed
                  </span>
                  {syncStatus.lastSyncResult.errors.length > 0 && (
                    <span className={styles.syncErrors}>
                      {syncStatus.lastSyncResult.errors.length} errors
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Warning */}
      {boardId && !isCurrentBoardMaster && (
        <div className={styles.warning}>
          <strong>Note:</strong> To sync or initialize, you must open this app from <em>inside the Master Board</em>.
          Click &quot;Open in Miro&quot; above, then open the app panel.
        </div>
      )}

      {/* Messages */}
      {error && <div className={styles.error}>{error}</div>}
      {successMessage && <div className={styles.success}>{successMessage}</div>}

      {/* Instructions */}
      <div className={styles.instructions}>
        <h4>How it works</h4>
        <ol>
          <li>Create a new board in Miro for the Master Overview</li>
          <li>Copy the board ID from the URL and paste it above, then click Save</li>
          <li>Click &quot;Open in Miro&quot; to go to the Master Board</li>
          <li>Open this app panel from inside the Master Board</li>
          <li>Click &quot;Initialize Board&quot; to create the title and structure</li>
          <li>Click &quot;Sync All Clients&quot; to populate with client data</li>
        </ol>
      </div>
    </div>
  );
});
