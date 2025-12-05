import { useState } from 'react';
import { Button, Skeleton } from '@shared/ui';
import { useProjects } from '../../hooks/useProjects';
import { ProjectCard } from '../ProjectCard';
import type { ProjectListProps } from './ProjectList.types';
import type { ProjectsQueryParams } from '../../domain/project.types';
import styles from './ProjectList.module.css';

export function ProjectList({
  params: initialParams = {},
  onProjectClick,
  onProjectEdit,
  onViewBoard,
  onUpdateGoogleDrive,
  emptyMessage = 'No projects found',
}: ProjectListProps) {
  const [page, setPage] = useState(initialParams.page || 1);
  const params: ProjectsQueryParams = { ...initialParams, page };

  const { data, isLoading, isError, error } = useProjects(params);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.error}>
        <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className={styles.errorMessage}>
          {error instanceof Error ? error.message : 'Error loading projects'}
        </p>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className={styles.empty}>
        <svg className={styles.emptyIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <h3 className={styles.emptyTitle}>No projects</h3>
        <p className={styles.emptyMessage}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {data.data.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            {...(onProjectClick ? { onView: onProjectClick } : {})}
            {...(onProjectEdit ? { onEdit: onProjectEdit } : {})}
            {...(onViewBoard ? { onViewBoard: onViewBoard } : {})}
            {...(onUpdateGoogleDrive ? { onUpdateGoogleDrive: onUpdateGoogleDrive } : {})}
          />
        ))}
      </div>

      {data.totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
