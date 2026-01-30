import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { projectService } from '../services/projectService';
import { projectKeys } from '../services/projectKeys';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';

export function useProject(id: string | undefined) {
  const queryClient = useQueryClient();

  // Invalidate this project's detail query when it changes in the DB
  const handleChange = useCallback(() => {
    if (id) {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) });
    }
  }, [queryClient, id]);

  // Subscribe to realtime changes on this specific project
  useRealtimeSubscription<{ id: string }>({
    table: 'projects',
    event: 'UPDATE',
    ...(id ? { filter: `id=eq.${id}` } : {}),
    onUpdate: handleChange,
    enabled: !!id,
  });

  return useQuery({
    queryKey: projectKeys.detail(id!),
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });
}
