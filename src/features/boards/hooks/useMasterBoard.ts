/**
 * React Query hooks for Master Board functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { masterBoardService } from '../services/masterBoardService';
import { adminService, adminKeys } from '@features/admin/services';

// Query keys for master board
export const masterBoardKeys = {
  all: ['masterBoard'] as const,
  settings: () => [...masterBoardKeys.all, 'settings'] as const,
  syncStatus: () => [...masterBoardKeys.all, 'syncStatus'] as const,
  validation: (boardId: string) => [...masterBoardKeys.all, 'validation', boardId] as const,
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
 * Hook to validate a board ID
 */
export function useMasterBoardValidation(boardId: string | null, accessToken: string | null) {
  return useQuery({
    queryKey: masterBoardKeys.validation(boardId || ''),
    queryFn: async () => {
      if (!boardId || !accessToken) {
        return { valid: false, error: 'Board ID or access token missing' };
      }
      masterBoardService.setAccessToken(accessToken);
      return masterBoardService.validateBoard(boardId);
    },
    enabled: !!boardId && !!accessToken,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
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
 * Hook to initialize the master board
 */
export function useMasterBoardInitialize() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, accessToken }: { boardId: string; accessToken: string }) => {
      masterBoardService.setAccessToken(accessToken);
      await masterBoardService.initializeMasterBoard(boardId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterBoardKeys.syncStatus() });
    },
  });
}

/**
 * Hook to sync all clients to the master board
 */
export function useMasterBoardSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ boardId, accessToken }: { boardId: string; accessToken: string }) => {
      masterBoardService.setAccessToken(accessToken);
      const result = await masterBoardService.syncAllClients(boardId);
      await masterBoardService.saveSyncStatus(result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterBoardKeys.syncStatus() });
    },
  });
}
