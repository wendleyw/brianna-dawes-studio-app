import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { ReportFilters } from '../domain/report.types';

/**
 * Hook to fetch timeline metrics with realtime updates
 * Automatically refreshes when projects change status
 */
export function useTimelineMetrics(filters: ReportFilters = {}) {
  const queryClient = useQueryClient();

  // Invalidate timeline metrics when projects change
  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: reportKeys.timeline(filters) });
  }, [queryClient, filters]);

  // Subscribe to project changes (affects timeline status distribution)
  useRealtimeSubscription<{ id: string; status: string }>({
    table: 'projects',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: reportKeys.timeline(filters),
    queryFn: () => reportService.getTimelineMetrics(filters),
  });
}
