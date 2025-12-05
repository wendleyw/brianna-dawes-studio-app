import { useState, useCallback } from 'react';
import type { Project, ProjectStatus } from '../../domain/project.types';
import { useProjectMutations } from '../../hooks';
import { createLogger } from '@shared/lib/logger';
import styles from './ProjectBoardModal.module.css';

const logger = createLogger('ProjectBoardModal');

interface ProjectBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
}

// Status columns configuration - matches unified 7-status system
const STATUS_COLUMNS: { id: ProjectStatus; label: string; color: string }[] = [
  { id: 'critical', label: 'Critical', color: '#EF4444' },
  { id: 'overdue', label: 'Overdue', color: '#F97316' },
  { id: 'urgent', label: 'Urgent', color: '#EAB308' },
  { id: 'on_track', label: 'On Track', color: '#3B82F6' },
  { id: 'in_progress', label: 'In Progress', color: '#8B5CF6' },
  { id: 'review', label: 'Review', color: '#6366F1' },
  { id: 'done', label: 'Done', color: '#22C55E' },
];

// Icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

const DragIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9" cy="6" r="2"/>
    <circle cx="15" cy="6" r="2"/>
    <circle cx="9" cy="12" r="2"/>
    <circle cx="15" cy="12" r="2"/>
    <circle cx="9" cy="18" r="2"/>
    <circle cx="15" cy="18" r="2"/>
  </svg>
);

export function ProjectBoardModal({ isOpen, onClose, projects }: ProjectBoardModalProps) {
  const { updateProject } = useProjectMutations();
  const [draggingProject, setDraggingProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  // Group projects by status
  const projectsByStatus = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = projects.filter(p => p.status === column.id);
    return acc;
  }, {} as Record<ProjectStatus, Project[]>);

  const handleDragStart = useCallback((e: React.DragEvent, project: Project) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);
    setDraggingProject(project);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingProject(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, newStatus: ProjectStatus) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggingProject) return;
    if (draggingProject.status === newStatus) return;

    try {
      await updateProject.mutateAsync({
        id: draggingProject.id,
        input: { status: newStatus },
      });
      // The mutation will trigger a refetch, updating the board
    } catch (error) {
      logger.error('Failed to update project status', error);
    }
  }, [draggingProject, updateProject]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <h2>Project Board</h2>
            <span className={styles.headerSubtitle}>Drag projects to change status</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        {/* Board */}
        <div className={styles.board}>
          {STATUS_COLUMNS.map((column) => (
            <div
              key={column.id}
              className={`${styles.column} ${dragOverColumn === column.id ? styles.columnDragOver : ''}`}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className={styles.columnHeader}>
                <span className={styles.columnDot} style={{ backgroundColor: column.color }} />
                <span className={styles.columnTitle}>{column.label}</span>
                <span className={styles.columnCount}>{projectsByStatus[column.id]?.length || 0}</span>
              </div>

              {/* Column Content */}
              <div className={styles.columnContent}>
                {projectsByStatus[column.id]?.map((project) => (
                  <div
                    key={project.id}
                    className={`${styles.card} ${draggingProject?.id === project.id ? styles.cardDragging : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className={styles.cardDragHandle}>
                      <DragIcon />
                    </div>
                    <div className={styles.cardContent}>
                      <h4 className={styles.cardTitle}>{project.name}</h4>
                      <div className={styles.cardMeta}>
                        {project.client?.name && (
                          <span className={styles.cardClient}>{project.client.name}</span>
                        )}
                        {project.dueDate && (
                          <span className={styles.cardDue}>
                            {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {project.priority === 'urgent' && (
                        <span className={styles.cardUrgent}>URGENT</span>
                      )}
                    </div>
                    <div className={styles.cardAvatar}>
                      {project.client?.avatarUrl ? (
                        <img src={project.client.avatarUrl} alt={project.client.name} />
                      ) : (
                        <span>{project.client?.name?.charAt(0).toUpperCase() || 'C'}</span>
                      )}
                    </div>
                  </div>
                ))}

                {projectsByStatus[column.id]?.length === 0 && (
                  <div className={styles.emptyColumn}>
                    <span>No projects</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className={styles.footer}>
          <span className={styles.footerInfo}>
            Changes sync automatically with Miro Timeline
          </span>
        </div>
      </div>
    </div>
  );
}
