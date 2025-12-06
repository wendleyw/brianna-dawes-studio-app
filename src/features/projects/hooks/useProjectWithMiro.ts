/**
 * Hook that combines project mutations with Miro board sync
 * When a project is created/updated, it also syncs to Miro board
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { projectKeys } from '../services/projectKeys';
import { useMiro } from '@features/boards';
import { miroTimelineService, miroProjectRowService } from '@features/boards/services/miroSdkService';
import { createLogger } from '@shared/lib/logger';
import type { CreateProjectInput, UpdateProjectInput, Project, ProjectBriefing } from '../domain/project.types';

const logger = createLogger('ProjectWithMiro');

// Default empty briefing
const DEFAULT_BRIEFING: ProjectBriefing = {
  projectOverview: null,
  finalMessaging: null,
  inspirations: null,
  targetAudience: null,
  deliverables: null,
  styleNotes: null,
  goals: null,
  timeline: null,
  resourceLinks: null,
  additionalNotes: null,
};

export function useCreateProjectWithMiro() {
  const queryClient = useQueryClient();
  const { isInMiro, miro } = useMiro();

  return useMutation({
    mutationFn: async (input: CreateProjectInput & { briefing?: Partial<ProjectBriefing> }) => {
      logger.debug('Starting project creation', { isInMiro, hasMiro: !!miro });

      // 1. Create project in database
      const project = await projectService.createProject(input);
      logger.info('Project created in DB', { id: project.id });

      // 2. If running in Miro, create board elements
      if (isInMiro && miro) {
        logger.debug('In Miro environment, creating board elements');
        try {
          // Initialize timeline if not already done
          const timelineState = miroTimelineService.getState();
          if (!timelineState) {
            logger.debug('Initializing Master Timeline');
            await miroTimelineService.initializeTimeline();
          }

          // Add project to Master Timeline
          logger.debug('Adding project to timeline', { name: project.name });
          await miroTimelineService.syncProject(project);

          // Create project row with briefing and process stages
          const briefing: ProjectBriefing = {
            ...DEFAULT_BRIEFING,
            projectOverview: input.briefing?.projectOverview || input.description || null,
            finalMessaging: input.briefing?.finalMessaging || null,
            inspirations: input.briefing?.inspirations || null,
            targetAudience: input.briefing?.targetAudience || null,
            deliverables: input.briefing?.deliverables || null,
            styleNotes: input.briefing?.styleNotes || null,
            goals: input.briefing?.goals || null,
            timeline: input.briefing?.timeline || null,
            resourceLinks: input.briefing?.resourceLinks || null,
            additionalNotes: input.briefing?.additionalNotes || null,
          };

          await miroProjectRowService.createProjectRow(project, briefing);
          logger.info('Miro sync complete', { name: project.name });
        } catch (error) {
          logger.error('Miro sync failed', error);
          // Don't throw - project was created successfully, just Miro sync failed
        }
      } else {
        logger.debug('Not in Miro environment, skipping board sync');
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

export function useUpdateProjectWithMiro() {
  const queryClient = useQueryClient();
  const { isInMiro, miro } = useMiro();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProjectInput }) => {
      // 1. Update project in database
      const project = await projectService.updateProject(id, input);

      // 2. If running in Miro, sync to timeline and update briefing status badge
      if (isInMiro && miro) {
        try {
          // Sync project to timeline (updates position based on status/priority)
          await miroTimelineService.syncProject(project);

          // Update the status badge in the briefing frame if status changed
          if (input.status) {
            await miroProjectRowService.updateBriefingStatus(project.id, project.status, project.name);
          }

          logger.debug('Project synced to Miro', { name: project.name, status: project.status });
        } catch (error) {
          logger.error('Miro sync failed', error);
        }
      }

      return project;
    },
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(project.id), project);
    },
  });
}

export function useDeleteProjectWithMiro() {
  const queryClient = useQueryClient();
  const { isInMiro, miro } = useMiro();

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. If running in Miro, remove from board first
      if (isInMiro && miro) {
        try {
          await miroTimelineService.removeProject(id);
          await miroProjectRowService.removeProjectRow(id);
          logger.debug('Project removed from Miro', { id });
        } catch (error) {
          logger.error('Miro removal failed', error);
        }
      }

      // 2. Delete from database
      await projectService.deleteProject(id);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}

/**
 * Composite hook with Miro integration
 */
export function useProjectMutationsWithMiro() {
  const createProject = useCreateProjectWithMiro();
  const updateProject = useUpdateProjectWithMiro();
  const deleteProject = useDeleteProjectWithMiro();

  return {
    createProject,
    updateProject,
    deleteProject,
    isCreating: createProject.isPending,
    isUpdating: updateProject.isPending,
    isDeleting: deleteProject.isPending,
  };
}
