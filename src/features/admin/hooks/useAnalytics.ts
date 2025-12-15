import { useQuery } from '@tanstack/react-query';
import { analyticsService, analyticsKeys } from '../services/analyticsService';
import type { AnalyticsFilters } from '../domain/analytics.types';

/**
 * Hook for fetching complete dashboard analytics data
 */
export function useDashboardAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.dashboard(),
    queryFn: () => analyticsService.getDashboardData(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for fetching overview metrics only
 */
export function useOverviewMetrics() {
  return useQuery({
    queryKey: analyticsKeys.overview(),
    queryFn: () => analyticsService.getOverviewMetrics(),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Hook for fetching client analytics
 */
export function useClientAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.clients(),
    queryFn: () => analyticsService.getClientAnalytics(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for fetching designer analytics
 */
export function useDesignerAnalytics() {
  return useQuery({
    queryKey: analyticsKeys.designers(),
    queryFn: () => analyticsService.getDesignerAnalytics(),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for fetching timeline data
 */
export function useTimelineData(filters?: AnalyticsFilters) {
  return useQuery({
    queryKey: analyticsKeys.timeline(filters),
    queryFn: () => analyticsService.getTimelineData(filters?.dateRange),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Hook for fetching monthly metrics
 */
export function useMonthlyMetrics() {
  return useQuery({
    queryKey: analyticsKeys.monthly(),
    queryFn: () => analyticsService.getMonthlyMetrics(),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook for fetching projects by status
 */
export function useProjectsByStatus() {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'projectsByStatus'],
    queryFn: () => analyticsService.getProjectsByStatus(),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for fetching recent projects
 */
export function useRecentProjects(limit = 10) {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'recentProjects', limit],
    queryFn: () => analyticsService.getRecentProjects(limit),
    staleTime: 1000 * 60 * 2,
  });
}

/**
 * Hook for fetching recent activity
 */
export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: [...analyticsKeys.all, 'recentActivity', limit],
    queryFn: () => analyticsService.getRecentActivity(limit),
    staleTime: 1000 * 60, // 1 minute
  });
}
