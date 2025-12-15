import { useQuery } from '@tanstack/react-query';
import type { DashboardStats, RecentActivity, SystemAlert } from '../domain/types';

// Query keys factory
export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  activity: () => [...adminKeys.all, 'activity'] as const,
  alerts: () => [...adminKeys.all, 'alerts'] as const,
};

// Mock API functions - to be replaced with real API calls
async function fetchDashboardStats(): Promise<DashboardStats> {
  // TODO: Replace with actual API call
  return {
    totalProjects: 24,
    totalUsers: 12,
    activeProjects: 8,
    syncHealth: 95,
    projectsByStatus: {
      draft: 3,
      in_progress: 8,
      review: 4,
      done: 12,
      archived: 2,
    },
  };
}

async function fetchRecentActivity(): Promise<RecentActivity[]> {
  // TODO: Replace with actual API call
  return [];
}

async function fetchSystemAlerts(): Promise<SystemAlert[]> {
  // TODO: Replace with actual API call
  return [];
}

// Hooks
export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: fetchDashboardStats,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: adminKeys.activity(),
    queryFn: fetchRecentActivity,
    staleTime: 1000 * 60, // 1 minute
  });
}

export function useSystemAlerts() {
  return useQuery({
    queryKey: adminKeys.alerts(),
    queryFn: fetchSystemAlerts,
    staleTime: 1000 * 60, // 1 minute
  });
}
