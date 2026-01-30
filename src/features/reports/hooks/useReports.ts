import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { reportRepository } from '../api/reportRepository';
import { reportKeys } from '../services/reportKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { ProjectReportFilters } from '../domain/report.types';

/**
 * Hook to fetch list of project reports with realtime updates
 */
export function useReports(filters: ProjectReportFilters = {}) {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: reportKeys.projectReports.all });
  }, [queryClient]);

  // Subscribe to realtime changes on project_reports table
  useRealtimeSubscription<{ id: string }>({
    table: 'project_reports',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: reportKeys.projectReports.list(filters),
    queryFn: () => reportRepository.list(filters),
  });
}
