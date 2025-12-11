/**
 * React Query hooks for Master Board functionality
 *
 * Note: Sync operations use the Miro SDK (client-side) and only work
 * when the app is running inside the Master Board.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterBoardService } from '../services/masterBoardService';
import { adminService, adminKeys } from '@features/admin/services';

// Query keys for master board
export const masterBoardKeys = {
  all: ['masterBoard'] as const,
  settings: () => [...masterBoardKeys.all, 'settings'] as const,
  syncStatus: () => [...masterBoardKeys.all, 'syncStatus'] as const,
};

/**
 * Hook to get/set the master board ID setting
 */
export function useMasterBoardSettings() {
  const queryClient = useQueryClient();

  const { data: boardId, isLoading } = useQuery({
    queryKey: adminKeys.setting('master_board_id'),
    queryFn: () => adminService.getSetting('master_board_id') as Promise<string | null>,
  });

  const saveMutation = useMutation({
    mutationFn: async (newBoardId: string) => {
      await adminService.upsertSetting({
        key: 'master_board_id',
        value: newBoardId,
        description: 'Master Board ID for consolidated client overview',
      });
      return newBoardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.setting('master_board_id') });
      queryClient.invalidateQueries({ queryKey: masterBoardKeys.settings() });
    },
  });

  return {
    boardId: boardId || null,
    isLoading,
    saveBoardId: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}

/**
 * Hook to get sync status
 */
export function useMasterBoardSyncStatus() {
  return useQuery({
    queryKey: masterBoardKeys.syncStatus(),
    queryFn: () => masterBoardService.getSyncStatus(),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Hook to initialize the master board using SDK
 * Must be called from within the Master Board context
 */
export function useMasterBoardInitialize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId }: { boardId: string }) => {
      await masterBoardService.initializeMasterBoardWithSdk(boardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterBoardKeys.syncStatus() });
    },
  });
}

/**
 * Hook to sync all clients to the master board using SDK
 * Must be called from within the Master Board context
 */
export function useMasterBoardSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId }: { boardId: string }) => {
      const result = await masterBoardService.syncAllClientsWithSdk(boardId);
      await masterBoardService.saveSyncStatus(result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterBoardKeys.syncStatus() });
    },
  });
}

/**
 * Hook to generate architecture diagram on the master board
 * Must be called from within a Miro board context
 */
export function useMasterBoardArchitectureDiagram() {
  return useMutation({
    mutationFn: async () => {
      await masterBoardService.generateArchitectureDiagramWithSdk();
    },
  });
}
