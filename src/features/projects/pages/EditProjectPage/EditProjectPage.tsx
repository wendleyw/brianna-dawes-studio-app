import { useParams, useNavigate } from 'react-router-dom';
import { Button, Skeleton } from '@shared/ui';
import { useProject, useUpdateProjectWithMiro } from '../../hooks';
import { ProjectForm } from '../../components';
import type { UpdateProjectInput } from '../../domain/project.types';
import { createLogger } from '@shared/lib/logger';
import { MiroNotifications } from '@shared/lib/miroNotifications';
import styles from './EditProjectPage.module.css';

const logger = createLogger('EditProjectPage');

export function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id || '');
  const updateProject = useUpdateProjectWithMiro();

  const handleSubmit = async (data: UpdateProjectInput) => {
    if (!id) return;

    try {
      await updateProject.mutateAsync({ id, input: data });
      logger.info('Project updated successfully', { id, name: data.name });

      // Show Miro notification
      await MiroNotifications.projectUpdated(data.name || project?.name || 'Project');

      // Navigate back to projects list
      navigate('/projects');
    } catch (err) {
      logger.error('Failed to update project', err);
      throw err;
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Skeleton width="100%" height={48} />
          <Skeleton width="100%" height={120} />
          <Skeleton width="50%" height={48} />
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>Project not found or error loading project.</p>
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.projectName}>
        <h2>{project.name}</h2>
      </div>

      <div className={styles.formWrapper}>
        <ProjectForm
          project={project}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={updateProject.isPending}
        />
      </div>
    </div>
  );
}
