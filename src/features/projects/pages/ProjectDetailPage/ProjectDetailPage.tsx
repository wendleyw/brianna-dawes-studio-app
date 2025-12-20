import { useParams, useNavigate } from 'react-router-dom';
import { Button, Badge, Skeleton } from '@shared/ui';
import { useProject } from '../../hooks/useProject';
import { getStatusColumn } from '@shared/lib/timelineStatus';
import { PRIORITY_CONFIG } from '@shared/lib/priorityConfig';
import { formatDateFull } from '@shared/lib/dateFormat';
import styles from './ProjectDetailPage.module.css';

// STATUS_MAP replaced by getStatusColumn from timelineStatus (uses color directly)
// PRIORITY_MAP replaced by PRIORITY_CONFIG from priorityConfig
// formatDate replaced by formatDateFull from @shared/lib/dateFormat

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, error } = useProject(id);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Skeleton height={40} width={200} />
          <Skeleton height={80} style={{ marginTop: 16 }} />
          <Skeleton height={400} style={{ marginTop: 24 }} />
        </div>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className={styles.errorMessage}>
            {error instanceof Error ? error.message : 'Project not found'}
          </p>
          <Button variant="secondary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const statusColumn = getStatusColumn(project.status);
  const priority = PRIORITY_CONFIG[project.priority];

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <div className={styles.badges}>
            <Badge
              style={{ backgroundColor: statusColumn.color, color: '#fff', border: 'none' }}
            >
              {statusColumn.label}
            </Badge>
            <Badge
              color="neutral"
              style={{ backgroundColor: priority.color, color: '#fff', border: 'none' }}
            >
              {priority.label}
            </Badge>
          </div>
          <h1 className={styles.title}>{project.name}</h1>
          {project.description && (
            <p className={styles.description}>{project.description}</p>
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => navigate(`/projects/${project.id}/edit`)}>
            Edit
          </Button>
          {project.miroBoardUrl && (
            <Button
              variant="primary"
              onClick={() => window.open(project.miroBoardUrl!, '_blank')}
            >
              Open in Miro
            </Button>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Miro Board</h3>
            <div className={styles.miroSection}>
              <div className={styles.miroPreview}>
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt="Board preview"
                    className={styles.miroPreviewImage}
                  />
                ) : (
                  <div className={styles.miroPlaceholder}>
                    <svg className={styles.miroIcon} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Details</h3>
            <div className={styles.infoList}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Start Date</span>
                <span className={styles.infoValue}>{formatDateFull(project.startDate)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Due Date</span>
                <span className={styles.infoValue}>{formatDateFull(project.dueDate)}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Deliverables</span>
                <span className={styles.infoValue}>{project.deliverablesCount}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>{formatDateFull(project.createdAt)}</span>
              </div>
            </div>
          </div>

          {project.client && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Client</h3>
              <div className={styles.clientInfo}>
                {project.client.avatarUrl ? (
                  <img
                    src={project.client.avatarUrl}
                    alt={project.client.name}
                    className={styles.clientAvatar}
                  />
                ) : (
                  <div className={styles.clientAvatar} />
                )}
                <span className={styles.clientName}>{project.client.name}</span>
              </div>
            </div>
          )}

          {project.designers.length > 0 && (
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Designers</h3>
              <div className={styles.designersList}>
                {project.designers.map((designer) => (
                  <div key={designer.id} className={styles.designerItem}>
                    {designer.avatarUrl ? (
                      <img
                        src={designer.avatarUrl}
                        alt={designer.name}
                        className={styles.designerAvatar}
                      />
                    ) : (
                      <div className={styles.designerAvatar} />
                    )}
                    <span className={styles.designerName}>{designer.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
