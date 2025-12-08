import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, adminKeys } from '../services';
import type { SubscriptionPlanId } from '../domain';

/**
 * Hook to fetch all subscription plans
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: adminKeys.subscriptionPlans(),
    queryFn: () => adminService.getSubscriptionPlans(),
    staleTime: 1000 * 60 * 5, // Plans rarely change, cache for 5 mins
  });
}

/**
 * Hook to fetch client plan stats
 */
export function useClientPlanStats(userId: string | null) {
  return useQuery({
    queryKey: adminKeys.clientPlanStats(userId || ''),
    queryFn: () => adminService.getClientPlanStats(userId!),
    enabled: !!userId,
  });
}

/**
 * Hook to fetch client plan stats by board ID
 */
export function useClientPlanStatsByBoard(boardId: string | null) {
  return useQuery({
    queryKey: adminKeys.clientPlanStatsByBoard(boardId || ''),
    queryFn: () => adminService.getClientPlanStatsByBoard(boardId!),
    enabled: !!boardId,
  });
}

/**
 * Hook for subscription plan mutations
 */
export function useSubscriptionPlanMutations() {
  const queryClient = useQueryClient();

  const assignPlan = useMutation({
    mutationFn: ({
      userId,
      planId,
      resetUsage = false,
    }: {
      userId: string;
      planId: SubscriptionPlanId | null;
      resetUsage?: boolean;
    }) => adminService.assignSubscriptionPlan(userId, planId, resetUsage),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
      queryClient.invalidateQueries({ queryKey: adminKeys.clientPlanStats(userId) });
    },
  });

  const updateUsage = useMutation({
    mutationFn: ({ userId, count }: { userId: string; count: number }) =>
      adminService.updateDeliverablesUsed(userId, count),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.clientPlanStats(userId) });
    },
  });

  const incrementUsage = useMutation({
    mutationFn: ({ userId, amount = 1 }: { userId: string; amount?: number }) =>
      adminService.incrementDeliverablesUsed(userId, amount),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.clientPlanStats(userId) });
    },
  });

  return {
    assignPlan,
    updateUsage,
    incrementUsage,
    isAssigning: assignPlan.isPending,
    isUpdating: updateUsage.isPending,
  };
}
