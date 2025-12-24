import { useQuery } from '@tanstack/react-query';
import { reportRepository } from '../api/reportRepository';
import { reportKeys } from '../services/reportKeys';

/**
 * Hook to fetch a single project report by ID
 */
export function useReport(id: string | null) {
  return useQuery({
    queryKey: reportKeys.projectReports.detail(id!),
    queryFn: () => reportRepository.getById(id!),
    enabled: !!id,
  });
}
