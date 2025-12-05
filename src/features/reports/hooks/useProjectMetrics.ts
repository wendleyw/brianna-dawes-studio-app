import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { reportKeys } from '../services/reportKeys';

export function useProjectMetrics(projectId: string | undefined) {
  return useQuery({
    queryKey: reportKeys.project(projectId!),
    queryFn: () => reportService.getProjectMetrics(projectId!),
    enabled: !!projectId,
  });
}
