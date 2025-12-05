import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, adminKeys } from '../services';
import type { AssignBoardInput } from '../domain';

export function useUserBoards(userId: string) {
  return useQuery({
    queryKey: adminKeys.userBoards(userId),
    queryFn: () => adminService.getUserBoards(userId),
    enabled: !!userId,
  });
}

export function useAllBoardAssignments() {
  return useQuery({
    queryKey: adminKeys.allBoards(),
    queryFn: () => adminService.getAllBoardAssignments(),
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
