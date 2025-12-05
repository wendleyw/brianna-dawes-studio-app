import { useQuery } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { projectKeys } from '../services/projectKeys';

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });
}
