import { useState, useMemo } from 'react';
import { useProjects } from '@features/projects/hooks';
import { useUsers } from '../../hooks';
import type { Project } from '@features/projects/domain';
import styles from './ProjectsTab.module.css';

type ViewMode = 'kanban' | 'table';

export default function ProjectsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [designerFilter, setDesignerFilter] = useState<string>('all');

  const { data: projectsResponse, isLoading: projectsLoading } = useProjects();
  const { data: users, isLoading: usersLoading } = useUsers();

  const allProjects = projectsResponse?.data || [];
  const designers = users?.filter((u) => u.role === 'designer') || [];

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
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-gray-500)' }}>
          Loading projects...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.filters}>
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="overdue">Overdue</option>
            <option value="urgent">Urgent</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
          </select>

          <select
            className={styles.filterSelect}
            value={designerFilter}
            onChange={(e) => setDesignerFilter(e.target.value)}
          >
            <option value="all">All Designers</option>
            {designers.map((designer) => (
              <option key={designer.id} value={designer.id}>
                {designer.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.viewToggle}>
          <button
            className={viewMode === 'kanban' ? styles.viewButtonActive : styles.viewButton}
            onClick={() => setViewMode('kanban')}
          >
            📋 Kanban
          </button>
          <button
            className={viewMode === 'table' ? styles.viewButtonActive : styles.viewButton}
            onClick={() => setViewMode('table')}
          >
            📊 Table
          </button>
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
        <div className={styles.tableView}>
          <p className={styles.emptyMessage}>Table view coming soon...</p>
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.footerButton}>📦 Archive Multiple</button>
        <button className={styles.footerButton}>🔄 Bulk Status Change</button>
        <button className={styles.footerButton}>📥 Export Report</button>
      </div>
    </div>
  );
}
