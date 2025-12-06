import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { deliverableService } from '../services/deliverableService';
import { deliverableKeys } from '../services/deliverableKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { DeliverablesQueryParams } from '../domain/deliverable.types';

/**
 * Hook to fetch deliverables with realtime updates
 * Automatically refreshes when deliverables are created, updated, or deleted
 */
export function useDeliverables(params: DeliverablesQueryParams = {}) {
  const queryClient = useQueryClient();

  // Invalidate queries when realtime changes occur
  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: deliverableKeys.all });
  }, [queryClient]);

  // Subscribe to realtime changes on deliverables table
  const filterValue = params.filters?.projectId ? `project_id=eq.${params.filters.projectId}` : undefined;
  useRealtimeSubscription<{ id: string; project_id: string }>({
    table: 'deliverables',
    event: '*',
    ...(filterValue && { filter: filterValue }),
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: deliverableKeys.list(params),
    queryFn: () => deliverableService.getDeliverables(params),
    placeholderData: keepPreviousData,
  });
}
