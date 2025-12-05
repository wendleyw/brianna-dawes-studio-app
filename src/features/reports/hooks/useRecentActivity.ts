import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: reportKeys.activity(limit),
    queryFn: () => reportService.getRecentActivity(limit),
    refetchInterval: 1000 * 30, // Refetch every 30 seconds
  });
}
