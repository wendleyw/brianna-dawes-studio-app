import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { reportRepository } from '../api/reportRepository';
import { reportKeys } from '../services/reportKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';

/**
 * Hook to fetch a single project report by ID with realtime updates
 */
export function useReport(id: string | null) {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: reportKeys.projectReports.detail(id) });
    }
  }, [queryClient, id]);

  // Subscribe to realtime changes on this specific report
  useRealtimeSubscription<{ id: string }>({
    table: 'project_reports',
    event: 'UPDATE',
    ...(id ? { filter: `id=eq.${id}` } : {}),
    onUpdate: handleChange,
    enabled: !!id,
  });

  return useQuery({
    queryKey: reportKeys.projectReports.detail(id!),
    queryFn: () => reportRepository.getById(id!),
    enabled: !!id,
  });
}
