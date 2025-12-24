import { useQuery } from '@tanstack/react-query';
import { reportRepository } from '../api/reportRepository';
import { reportKeys } from '../services/reportKeys';
import type { ProjectReportFilters } from '../domain/report.types';

/**
 * Hook to fetch list of project reports
 */
export function useReports(filters: ProjectReportFilters = {}) {
  return useQuery({
    queryKey: reportKeys.projectReports.list(filters),
    queryFn: () => reportRepository.list(filters),
  });
}
