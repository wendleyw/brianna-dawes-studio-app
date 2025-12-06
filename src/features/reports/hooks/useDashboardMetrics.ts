import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';

/**
 * Hook to fetch dashboard metrics with realtime updates
 * Automatically refreshes when projects or deliverables change
 */
export function useDashboardMetrics() {
  const queryClient = useQueryClient();

  // Invalidate dashboard metrics when changes occur
  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: reportKeys.dashboard() });
  }, [queryClient]);

  // Subscribe to project changes (affects project counts, status distribution)
  useRealtimeSubscription<{ id: string }>({
    table: 'projects',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  // Subscribe to deliverable changes (affects deliverable counts)
  useRealtimeSubscription<{ id: string }>({
    table: 'deliverables',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportService.getDashboardMetrics(),
    staleTime: 1000 * 60, // 1 minute (reduced from 5 since we have realtime)
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes as fallback
  });
}
