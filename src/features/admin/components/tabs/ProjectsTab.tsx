import { useState } from 'react';
import styles from './ProjectsTab.module.css';

type ViewMode = 'kanban' | 'table';

export default function ProjectsTab() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Mock data
  const projects = {
    draft: [
      { id: '1', name: 'Logo Redesign', client: 'Tech Corp', designer: 'Sarah M.' },
      { id: '2', name: 'Brand Guide', client: 'StartupX', designer: 'John D.' },
    ],
    in_progress: [
      { id: '3', name: 'Website Design', client: 'E-commerce Co', designer: 'Mike D.' },
      { id: '4', name: 'App UI/UX', client: 'Mobile Inc', designer: 'Sarah M.' },
      { id: '5', name: 'Packaging', client: 'Food Brand', designer: 'John D.' },
    ],
    review: [
      { id: '6', name: 'Social Media Kit', client: 'Influencer', designer: 'Mike D.' },
    ],
    done: [
      { id: '7', name: 'Business Cards', client: 'Law Firm', designer: 'Sarah M.' },
      { id: '8', name: 'Flyer Design', client: 'Event Co', designer: 'John D.' },
    ],
  };

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
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="done">Done</option>
            <option value="archived">Archived</option>
          </select>

          <select className={styles.filterSelect}>
            <option value="all">All Designers</option>
            <option value="sarah">Sarah M.</option>
            <option value="john">John D.</option>
            <option value="mike">Mike D.</option>
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
          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>Draft</span>
              <span className={styles.kanbanCount}>{projects.draft.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.draft.map((project) => (
                <div key={project.id} className={styles.kanbanCard}>
                  <div className={styles.cardTitle}>{project.name}</div>
                  <div className={styles.cardMeta}>
                    <span>👤 {project.client}</span>
                    <span>🎨 {project.designer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>In Progress</span>
              <span className={styles.kanbanCount}>{projects.in_progress.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.in_progress.map((project) => (
                <div key={project.id} className={styles.kanbanCard}>
                  <div className={styles.cardTitle}>{project.name}</div>
                  <div className={styles.cardMeta}>
                    <span>👤 {project.client}</span>
                    <span>🎨 {project.designer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>Review</span>
              <span className={styles.kanbanCount}>{projects.review.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.review.map((project) => (
                <div key={project.id} className={styles.kanbanCard}>
                  <div className={styles.cardTitle}>{project.name}</div>
                  <div className={styles.cardMeta}>
                    <span>👤 {project.client}</span>
                    <span>🎨 {project.designer}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.kanbanColumn}>
            <div className={styles.kanbanHeader}>
              <span className={styles.kanbanTitle}>Done</span>
              <span className={styles.kanbanCount}>{projects.done.length}</span>
            </div>
            <div className={styles.kanbanCards}>
              {projects.done.map((project) => (
                <div key={project.id} className={styles.kanbanCard}>
                  <div className={styles.cardTitle}>{project.name}</div>
                  <div className={styles.cardMeta}>
                    <span>👤 {project.client}</span>
                    <span>🎨 {project.designer}</span>
                  </div>
                </div>
              ))}
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
