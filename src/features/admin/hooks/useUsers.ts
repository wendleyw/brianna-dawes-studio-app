import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, adminKeys } from '../services';
import type { CreateUserInput, UpdateUserInput } from '../domain';

export function useUsers() {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => adminService.getUsers(),
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();

  const createUser = useMutation({
    mutationFn: (input: CreateUserInput) => adminService.createUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  const updateUser = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) =>
      adminService.updateUser(id, input),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(id) });
    },
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });

  return {
    createUser,
    updateUser,
    deleteUser,
    isCreating: createUser.isPending,
    isUpdating: updateUser.isPending,
    isDeleting: deleteUser.isPending,
  };
}
