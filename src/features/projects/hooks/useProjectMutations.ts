import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { projectKeys } from '../services/projectKeys';
import type { CreateProjectInput, UpdateProjectInput, Project, ProjectStatus } from '../domain/project.types';

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateProjectInput) => projectService.createProject(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      projectService.updateProject(id, input),
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(project.id), project);

      // Optimistically update any cached lists so UI reflects changes immediately
      queryClient.setQueriesData({ queryKey: projectKeys.lists() }, (oldData: unknown) => {
        if (!oldData || typeof oldData !== 'object') return oldData;
        if (!('data' in oldData)) return oldData;
        const typed = oldData as { data: Project[] };
        if (!Array.isArray(typed.data)) return oldData;

        const next = typed.data.map((p) => (p.id === project.id ? project : p));
        return { ...(oldData as Record<string, unknown>), data: next };
      });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => projectService.archiveProject(id),
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(project.id), project);
    },
  });
}

export function useUnarchiveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newStatus = 'in_progress' }: { id: string; newStatus?: ProjectStatus }) =>
      projectService.unarchiveProject(id, newStatus),
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(project.id), project);
    },
  });
}

// Composite hook for convenience
export function useProjectMutations() {
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();

  return {
    createProject,
    updateProject,
    deleteProject,
    archiveProject,
    unarchiveProject,
    isCreating: createProject.isPending,
    isUpdating: updateProject.isPending,
    isDeleting: deleteProject.isPending,
    isArchiving: archiveProject.isPending,
    isUnarchiving: unarchiveProject.isPending,
  };
}
