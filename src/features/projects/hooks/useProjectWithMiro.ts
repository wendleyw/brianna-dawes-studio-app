/**
 * Hook that combines project mutations with Miro board sync
 * When a project is created/updated, it also syncs to Miro board
 *
 * UPDATED: Now uses projectSyncOrchestrator for proper sync status tracking
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { projectKeys } from '../services/projectKeys';
import { useMiro } from '@features/boards';
import { miroTimelineService, miroProjectRowService } from '@features/boards/services/miroSdkService';
import { projectSyncOrchestrator } from '@features/boards/services/projectSyncOrchestrator';
import { MiroNotifications } from '@shared/lib/miroNotifications';
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
    mutationFn: async (input: CreateProjectInput & { briefing?: Partial<ProjectBriefing>; skipMiroSync?: boolean }) => {
      const { skipMiroSync, ...projectInput } = input;

      logger.debug('Starting project creation', {
        isInMiro,
        hasMiro: !!miro,
        skipMiroSync,
        miroBoardId: projectInput.miroBoardId,
      });

      // Prepare briefing data
      // Note: Do NOT use input.description as fallback - it contains the full markdown description
      // which would pollute individual briefing fields. If projectOverview is empty, keep it null
      // so the Miro board shows "Needs attention" for that field.
      const briefing: ProjectBriefing = {
        ...DEFAULT_BRIEFING,
        projectOverview: projectInput.briefing?.projectOverview || null,
        finalMessaging: projectInput.briefing?.finalMessaging || null,
        inspirations: projectInput.briefing?.inspirations || null,
        targetAudience: projectInput.briefing?.targetAudience || null,
        deliverables: projectInput.briefing?.deliverables || null,
        styleNotes: projectInput.briefing?.styleNotes || null,
        goals: projectInput.briefing?.goals || null,
        timeline: projectInput.briefing?.timeline || null,
        resourceLinks: projectInput.briefing?.resourceLinks || null,
        additionalNotes: projectInput.briefing?.additionalNotes || null,
      };

      // If skipMiroSync is true, only create in DB (project is for different board)
      if (skipMiroSync) {
        logger.debug('Skipping Miro sync - project is for a different board');
        const project = await projectService.createProject({ ...projectInput, briefing });
        logger.info('Project created in DB (sync skipped - different board)', {
          id: project.id,
          miroBoardId: project.miroBoardId,
        });
        await MiroNotifications.showInfo(`Project created! It will appear on the client's board when you open it.`);
        return project;
      }

      // If in Miro, use orchestrator for proper sync status tracking
      if (isInMiro && miro) {
        logger.debug('In Miro environment, using projectSyncOrchestrator');

        // Initialize timeline if not already done
        const timelineState = miroTimelineService.getState();
        if (!timelineState) {
          logger.debug('Initializing Master Timeline');
          await miroTimelineService.initializeTimeline();
        }

        const result = await projectSyncOrchestrator.createProjectWithSync({
          ...projectInput,
          briefing,
        });

        if (!result.success) {
          logger.warn('Miro sync failed but project created', {
            projectId: result.project.id,
            error: result.error?.message,
            retryable: result.retryable,
          });
          // Notify user about sync failure
          await MiroNotifications.syncError(`Project created but Miro sync failed. It will retry automatically.`);
        } else {
          logger.info('Project created and synced successfully', { name: result.project.name });
        }

        return result.project;
      }

      // Not in Miro - just create in database
      logger.debug('Not in Miro environment, creating project in DB only');
      const project = await projectService.createProject({ ...projectInput, briefing });
      logger.info('Project created in DB (no Miro sync)', { id: project.id });

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
      // Use orchestrator when in Miro for proper sync status tracking
      if (isInMiro && miro) {
        logger.debug('In Miro environment, using orchestrator for update sync');

        const result = await projectSyncOrchestrator.updateProjectWithSync(id, input);

        if (!result.success) {
          logger.warn('Miro sync failed during update', {
            projectId: id,
            error: result.error?.message,
          });
          await MiroNotifications.syncError('Project updated but Miro sync failed');
        } else {
          // Update briefing status badge if status changed
          if (input.status) {
            try {
              await miroProjectRowService.updateBriefingStatus(
                result.project.id,
                result.project.status,
                result.project.name
              );
            } catch (error) {
              logger.warn('Failed to update briefing status badge', error);
            }
          }

          logger.debug('Project synced to Miro via orchestrator', {
            name: result.project.name,
            status: result.project.status,
          });
        }

        // Show Miro notification (only for non-status updates)
        if (!input.status) {
          await MiroNotifications.projectUpdated(result.project.name);
        }

        return result.project;
      }

      // Not in Miro - just update in database
      logger.debug('Not in Miro, updating project in DB only');
      const project = await projectService.updateProject(id, input);

      return project;
    },
    onSuccess: (project: Project) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.setQueryData(projectKeys.detail(project.id), project);
    },
    onError: async () => {
      await MiroNotifications.error('Failed to update project');
    },
  });
}

export function useDeleteProjectWithMiro() {
  const queryClient = useQueryClient();
  const { isInMiro, miro } = useMiro();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get project name for notification before deleting
      let projectName = 'Project';
      try {
        const project = await projectService.getProject(id);
        projectName = project.name;
      } catch {
        // Ignore if we can't get the name
      }

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

      // 3. Show Miro notification
      await MiroNotifications.projectDeleted(projectName);
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) });
    },
    onError: async () => {
      await MiroNotifications.error('Failed to delete project');
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
