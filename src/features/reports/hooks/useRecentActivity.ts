import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';

/**
 * Hook to fetch recent activity with realtime updates
 * Automatically refreshes when projects, deliverables, or updates change
 */
export function useRecentActivity(limit = 20) {
  const queryClient = useQueryClient();

  // Invalidate activity query when changes occur
  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: reportKeys.activity(limit) });
  }, [queryClient, limit]);

  // Subscribe to project changes
  useRealtimeSubscription<{ id: string }>({
    table: 'projects',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  // Subscribe to deliverable changes
  useRealtimeSubscription<{ id: string }>({
    table: 'deliverables',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  // Subscribe to project_updates for activity log
  useRealtimeSubscription<{ id: string }>({
    table: 'project_updates',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: reportKeys.activity(limit),
    queryFn: () => reportService.getRecentActivity(limit),
    // Keep polling as fallback, but less frequently
    refetchInterval: 1000 * 60, // Every 60 seconds as fallback
  });
}
