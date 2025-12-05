import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';
import type { ReportFilters } from '../domain/report.types';

export function useTimelineMetrics(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.timeline(filters),
    queryFn: () => reportService.getTimelineMetrics(filters),
  });
}
