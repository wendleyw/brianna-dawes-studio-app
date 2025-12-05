import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportService.getDashboardMetrics(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
  });
}
