import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { adminService, adminKeys } from '../services';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { AssignBoardInput } from '../domain';

/**
 * Hook to fetch user boards with realtime updates
 */
export function useUserBoards(userId: string) {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.userBoards(userId) });
  }, [queryClient, userId]);

  // Subscribe to user_boards changes for this user
  useRealtimeSubscription<{ user_id: string; board_id: string }>({
    table: 'user_boards',
    event: '*',
    ...(userId && { filter: `user_id=eq.${userId}` }),
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
    enabled: !!userId,
  });

  return useQuery({
    queryKey: adminKeys.userBoards(userId),
    queryFn: () => adminService.getUserBoards(userId),
    enabled: !!userId,
  });
}

/**
 * Hook to fetch all board assignments with realtime updates
 */
export function useAllBoards() {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.allBoards() });
  }, [queryClient]);

  // Subscribe to all user_boards changes
  useRealtimeSubscription<{ user_id: string; board_id: string }>({
    table: 'user_boards',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: adminKeys.allBoards(),
    queryFn: () => adminService.getAllBoardAssignments(),
  });
}

/**
 * Hook to fetch all unique boards from the boards table
 */
export function useBoards() {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.boards() });
  }, [queryClient]);

  // Subscribe to boards table changes
  useRealtimeSubscription<{ id: string; name: string }>({
    table: 'boards',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: adminKeys.boards(),
    queryFn: () => adminService.getBoards(),
  });
}

export function useBoardAssignmentMutations() {
  const queryClient = useQueryClient();

  const assignBoard = useMutation({
    mutationFn: (input: AssignBoardInput) => adminService.assignBoard(input),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userBoards(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.allBoards() });
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  const removeBoard = useMutation({
    mutationFn: ({ userId, boardId }: { userId: string; boardId: string }) =>
      adminService.removeBoard(userId, boardId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userBoards(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.allBoards() });
    },
  });

  const setPrimaryBoard = useMutation({
    mutationFn: ({ userId, boardId }: { userId: string; boardId: string }) =>
      adminService.setPrimaryBoard(userId, boardId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.userBoards(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  return {
    assignBoard,
    removeBoard,
    setPrimaryBoard,
    isAssigning: assignBoard.isPending,
    isRemoving: removeBoard.isPending,
    isSettingPrimary: setPrimaryBoard.isPending,
  };
}
