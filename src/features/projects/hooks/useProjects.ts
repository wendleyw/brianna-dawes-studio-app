import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useCallback } from 'react';
import { projectService } from '../services/projectService';
import { projectKeys } from '../services/projectKeys';
import { useAuth } from '@features/auth';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { ProjectsQueryParams } from '../domain/project.types';

interface UseProjectsOptions extends ProjectsQueryParams {
  /** Skip role-based filtering (for admin views) */
  skipRoleFilter?: boolean;
}

export function useProjects(options: UseProjectsOptions = {}) {
  const { user } = useAuth();
  const { skipRoleFilter, ...params } = options;
  const queryClient = useQueryClient();

  // Invalidate project queries when realtime changes occur
  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: projectKeys.all });
  }, [queryClient]);

  // Subscribe to realtime changes on projects table
  useRealtimeSubscription<{ id: string }>({
    table: 'projects',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
    enabled: !!user,
  });

  // Determine query function based on user role
  const getQueryFn = () => {
    // If no user or admin, return all projects
    if (!user || user.role === 'admin' || skipRoleFilter) {
      return () => projectService.getProjects(params);
    }

    // For clients: Let RLS policy handle filtering
    // RLS allows clients to see:
    // 1. Projects where they are the client_id (owner)
    // 2. All projects on their primary_board_id
    if (user.role === 'client') {
      return () => projectService.getProjects(params);
    }

    // For designers, use the special method
    if (user.role === 'designer') {
      return () => projectService.getProjectsForDesigner(user.id, params);
    }

    // Fallback
    return () => projectService.getProjects(params);
  };

  // Include user role in query key to refetch when user changes
  const queryKey = [...projectKeys.list(params), user?.role, user?.id];

  return useQuery({
    queryKey,
    queryFn: getQueryFn(),
    placeholderData: keepPreviousData,
    enabled: !!user, // Only run query when user is available
  });
}
