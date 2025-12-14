/**
 * Project Edit Modal
 * Standalone modal for editing a project from within Miro board
 * Syncs changes to both database and Miro board elements
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Skeleton } from '@shared/ui';
import { useMiro, miroProjectRowService } from '@features/boards';
import { useProject, useUpdateProjectWithMiro } from '@features/projects/hooks';
import { ProjectForm } from '@features/projects/components';
import { projectKeys } from '@features/projects/services/projectKeys';
import { broadcastProjectChange } from '@shared/lib/projectBroadcast';
import { MiroNotifications } from '@shared/lib/miroNotifications';
import { createLogger } from '@shared/lib/logger';
import type { UpdateProjectInput } from '@features/projects/domain/project.types';
import styles from './ProjectEditModal.module.css';

const logger = createLogger('ProjectEditModal');

interface ProjectEditModalProps {
  projectId: string;
}

// Icons
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export function ProjectEditModal({ projectId }: ProjectEditModalProps) {
  const { miro } = useMiro();
  const queryClient = useQueryClient();
  const { data: project, isLoading, error } = useProject(projectId);
  const updateProject = useUpdateProjectWithMiro();

  const handleClose = useCallback(async () => {
    if (miro) {
      await miro.board.ui.closeModal();
    }
  }, [miro]);

  const handleSubmit = async (data: UpdateProjectInput) => {
    try {
      logger.info('Updating project from modal', { projectId, data });

      // 1. Update project in database (this also syncs to Miro timeline)
      const updatedProject = await updateProject.mutateAsync({ id: projectId, input: data });

      // 2. Update briefing status badge if status changed
      if (data.status && data.status !== project?.status) {
        await miroProjectRowService.updateBriefingStatus(
          projectId,
          data.status,
          data.name || project?.name
        );
      }

      // 3. Invalidate queries to refresh data everywhere
      await queryClient.invalidateQueries({ queryKey: projectKeys.all });

      // 4. Broadcast change to other contexts (panel)
      broadcastProjectChange({
        type: 'PROJECT_UPDATED',
        projectId,
        status: updatedProject.status,
      });

      // 5. Show success notification
      await MiroNotifications.projectUpdated(data.name || project?.name || 'Project');

      logger.info('Project updated successfully', { projectId });

      // 6. Close modal
      await handleClose();
    } catch (err) {
      logger.error('Failed to update project', err);
      await MiroNotifications.error('Failed to update project');
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Project</h1>
          <button className={styles.closeBtn} onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.loading}>
            <Skeleton width="100%" height={48} />
            <Skeleton width="100%" height={120} />
            <Skeleton width="50%" height={48} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Edit Project</h1>
          <button className={styles.closeBtn} onClick={handleClose}>
            <CloseIcon />
          </button>
        </div>
        <div className={styles.content}>
          <div className={styles.error}>
            <p>Project not found or error loading project.</p>
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Project</h1>
        <span className={styles.projectName}>{project.name}</span>
        <button className={styles.closeBtn} onClick={handleClose}>
          <CloseIcon />
        </button>
      </div>
      <div className={styles.content}>
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
          onCancel={handleClose}
          isLoading={updateProject.isPending}
        />
      </div>
    </div>
  );
}
