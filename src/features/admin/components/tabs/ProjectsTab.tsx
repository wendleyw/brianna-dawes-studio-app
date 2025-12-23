import { useState, useMemo } from 'react';
import { useProjects } from '@features/projects/hooks';
import { useUsers } from '../../hooks';
import type { Project } from '@features/projects/domain';
import baseStyles from './AdminTab.module.css';
import styles from './ProjectsTab.module.css';

type ViewMode = 'kanban' | 'table';
const EMPTY_PROJECTS: Project[] = [];

export default function ProjectsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [designerFilter, setDesignerFilter] = useState<string>('all');

  const { data: projectsResponse, isLoading: projectsLoading } = useProjects();
  const { data: users, isLoading: usersLoading } = useUsers();

  const allProjects = useMemo(() => projectsResponse?.data ?? EMPTY_PROJECTS, [projectsResponse?.data]);
  const designers = useMemo(() => (users ?? []).filter((u) => u.role === 'designer'), [users]);

  const projects = useMemo(() => {
    if (!allProjects) return { overdue: [], urgent: [], in_progress: [], review: [], done: [] };

    const filtered = allProjects.filter((p: Project) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (designerFilter !== 'all') {
        const hasDesigner = p.designers?.some((d) => d.id === designerFilter);
        if (!hasDesigner) return false;
      }
      return true;
    });

    return {
      overdue: filtered.filter((p: Project) => p.status === 'overdue'),
      urgent: filtered.filter((p: Project) => p.status === 'urgent'),
      in_progress: filtered.filter((p: Project) => p.status === 'in_progress'),
      review: filtered.filter((p: Project) => p.status === 'review'),
      done: filtered.filter((p: Project) => p.status === 'done' && !p.archivedAt),
    };
  }, [allProjects, statusFilter, designerFilter]);

  if (projectsLoading || usersLoading) {
    return (
      <div className={baseStyles.tabContainer}>
        <div className={baseStyles.loading}>Loading projects...</div>
      </div>
    );
  }

  return (
    <div className={baseStyles.tabContainer}>
      {/* Tab Header */}
      <div className={baseStyles.tabHeader}>
        <div className={baseStyles.tabHeaderMain}>
          <h2 className={baseStyles.tabTitle}>All Projects</h2>
          <p className={baseStyles.tabSubtitle}>Manage and track all projects across the studio</p>
        </div>
        <div className={baseStyles.tabHeaderActions}>
          <button
            className={viewMode === 'kanban' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
            onClick={() => setViewMode('kanban')}
          >
            Kanban
          </button>
          <button
            className={viewMode === 'table' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
            onClick={() => setViewMode('table')}
          >
            Table
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={statusFilter === 'all' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setStatusFilter('all')}
        >
          All Status
        </button>
        <button
          className={statusFilter === 'overdue' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setStatusFilter('overdue')}
        >
          Overdue
        </button>
        <button
          className={statusFilter === 'urgent' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setStatusFilter('urgent')}
        >
          Urgent
        </button>
        <button
          className={statusFilter === 'in_progress' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setStatusFilter('in_progress')}
        >
          In Progress
        </button>
        <button
          className={statusFilter === 'review' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setStatusFilter('review')}
        >
          Review
        </button>
        <button
          className={statusFilter === 'done' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setStatusFilter('done')}
        >
          Done
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className={designerFilter === 'all' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
            onClick={() => setDesignerFilter('all')}
          >
            All Designers
          </button>
          {designers.map((designer) => (
            <button
              key={designer.id}
              className={designerFilter === designer.id ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
              onClick={() => setDesignerFilter(designer.id)}
            >
              {designer.name}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'kanban' ? (
        <div className={styles.kanbanBoard}>
          {projects.overdue.length > 0 && (
            <div className={styles.kanbanColumn}>
              <div className={styles.kanbanHeader}>
                <span className={styles.kanbanTitle}>🔴 Overdue</span>
                <span className={styles.kanbanCount}>{projects.overdue.length}</span>
              </div>
              <div className={styles.kanbanCards}>
                {projects.overdue.map((project: Project) => {
                  const clientName = project.client?.name || 'N/A';
                  const designerNames =
                    project.designers?.map((d) => d.name).join(', ') || 'Unassigned';

                  return (
                    <div key={project.id} className={styles.kanbanCard}>
                      <div className={styles.cardTitle}>{project.name}</div>
                      <div className={styles.cardMeta}>
                        <span>👤 {clientName}</span>
                        <span>🎨 {designerNames}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {projects.urgent.length > 0 && (
            <div className={styles.kanbanColumn}>
              <div className={styles.kanbanHeader}>
                <span className={styles.kanbanTitle}>⚠️ Urgent</span>
                <span className={styles.kanbanCount}>{projects.urgent.length}</span>
              </div>
              <div className={styles.kanbanCards}>
                {projects.urgent.map((project: Project) => {
                  const clientName = project.client?.name || 'N/A';
                  const designerNames =
                    project.designers?.map((d) => d.name).join(', ') || 'Unassigned';

                  return (
                    <div key={project.id} className={styles.kanbanCard}>
                      <div className={styles.cardTitle}>{project.name}</div>
                      <div className={styles.cardMeta}>
                        <span>👤 {clientName}</span>
                        <span>🎨 {designerNames}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>In Progress</span>
              <span className={styles.kanbanCount}>{projects.in_progress.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.in_progress.map((project: Project) => {
                const clientName = project.client?.name || 'N/A';
                const designerNames =
                  project.designers?.map((d) => d.name).join(', ') || 'Unassigned';

                return (
                  <div key={project.id} className={styles.kanbanCard}>
                    <div className={styles.cardTitle}>{project.name}</div>
                    <div className={styles.cardMeta}>
                      <span>👤 {clientName}</span>
                      <span>🎨 {designerNames}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>Review</span>
              <span className={styles.kanbanCount}>{projects.review.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.review.map((project: Project) => {
                const clientName = project.client?.name || 'N/A';
                const designerNames =
                  project.designers?.map((d) => d.name).join(', ') || 'Unassigned';

                return (
                  <div key={project.id} className={styles.kanbanCard}>
                    <div className={styles.cardTitle}>{project.name}</div>
                    <div className={styles.cardMeta}>
                      <span>👤 {clientName}</span>
                      <span>🎨 {designerNames}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>Done</span>
              <span className={styles.kanbanCount}>{projects.done.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.done.map((project: Project) => {
                const clientName = project.client?.name || 'N/A';
                const designerNames =
                  project.designers?.map((d) => d.name).join(', ') || 'Unassigned';

                return (
                  <div key={project.id} className={styles.kanbanCard}>
                    <div className={styles.cardTitle}>{project.name}</div>
                    <div className={styles.cardMeta}>
                      <span>👤 {clientName}</span>
                      <span>🎨 {designerNames}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className={baseStyles.emptyState}>
          <div className={baseStyles.emptyStateIcon}>📊</div>
          <h3 className={baseStyles.emptyStateTitle}>Table View</h3>
          <p className={baseStyles.emptyStateMessage}>Table view coming soon</p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button className={baseStyles.actionButton}>Archive Multiple</button>
        <button className={baseStyles.actionButton}>Bulk Status Change</button>
        <button className={baseStyles.actionButton}>Export Report</button>
      </div>
    </div>
  );
}
