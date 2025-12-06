import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Logo } from '@shared/ui';
import { useAuth } from '@features/auth';
import { useProjects } from '@features/projects';
import { zoomToProject } from '@features/boards';
import { supabase } from '@shared/lib/supabase';
import styles from './DashboardPage.module.css';
import type { ProjectStatus } from '@features/projects/domain/project.types';

// Icons
const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const GridIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
);

// Timeline status colors - unified 7-status system (same as Miro board)
const STATUS_COLORS: Record<ProjectStatus, { color: string; label: string }> = {
  critical: { color: '#EF4444', label: 'CRITICAL' },
  overdue: { color: '#F97316', label: 'OVERDUE' },
  urgent: { color: '#EAB308', label: 'URGENT' },
  on_track: { color: '#3B82F6', label: 'ON TRACK' },
  in_progress: { color: '#8B5CF6', label: 'IN PROGRESS' },
  review: { color: '#6366F1', label: 'REVIEW' },
  done: { color: '#22C55E', label: 'DONE' },
};

// Get color for a project based on its status
function getProjectColor(project: { status: ProjectStatus }): string {
  return STATUS_COLORS[project.status]?.color || '#6B7280';
}

// Get month key for grouping (e.g., "2024-11" for November 2024)
function getMonthKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Get month label from key (e.g., "NOV" from "2024-11")
function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year || '2024', 10), parseInt(month || '1', 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

// Get all months between earliest and latest project dates
function getMonthRange(projects: Array<{ dueDate: string | null }>): string[] {
  const projectsWithDates = projects.filter(p => p.dueDate);
  if (projectsWithDates.length === 0) return [];

  const dates = projectsWithDates.map(p => new Date(p.dueDate!));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const months: string[] = [];
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  while (current <= end) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

// Group projects by month
function groupProjectsByMonth<T extends { dueDate: string | null }>(projects: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  projects.forEach(project => {
    if (!project.dueDate) return;
    const monthKey = getMonthKey(project.dueDate);
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(project);
  });

  return grouped;
}

// Format date to "Dec 11" format
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: projectsData, isLoading: projectsLoading } = useProjects();

  // Query deliverables directly to avoid RPC issues
  const { data: deliverablesData, isLoading: deliverablesLoading } = useQuery({
    queryKey: ['deliverables-stats'],
    queryFn: async () => {
      // Try to get count and bonus_count
      const { data, error } = await supabase
        .from('deliverables')
        .select('count, bonus_count');

      // If bonus_count doesn't exist, fallback to just count
      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('deliverables')
          .select('count');
        if (fallbackError) throw fallbackError;
        return (fallbackData || []).map(d => ({ count: d.count, bonus_count: 0 }));
      }
      return data || [];
    },
  });

  const isLoading = projectsLoading || deliverablesLoading;
  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const canCreateProjects = isAdmin || isClient;

  // Get projects array from response
  const projectsList = projectsData?.data || [];

  // Calculate stats using new 7-status system
  const activeProjects = projectsList.filter(p =>
    p.status !== 'done' // All non-done projects are considered active
  ).length;
  const completedProjects = projectsList.filter(p => p.status === 'done').length;

  // Calculate deliverable stats from direct query
  const totalDeliverables = deliverablesData?.length || 0;
  const totalAssets = deliverablesData?.reduce((sum, d) => sum + ((d.count as number) || 0), 0) || 0;
  const totalBonusAssets = deliverablesData?.reduce((sum, d) => sum + ((d.bonus_count as number) || 0), 0) || 0;

  // Get projects for timeline (ALL statuses, organized by date)
  const timelineProjects = projectsList
    .filter(p => p.dueDate) // Only need due date
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  // Get all months in range and group projects by month
  const monthRange = getMonthRange(timelineProjects);
  const projectsByMonth = groupProjectsByMonth(timelineProjects);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Skeleton height={100} />
          <Skeleton height={80} />
          <Skeleton height={120} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with Logo */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Logo size="lg" />
        </div>
        <p className={styles.brandName}>BRIANNA DAWES STUDIOS</p>
        <h1 className={styles.welcome}>
          Welcome, <span className={styles.userName}>{user?.name?.split(' ')[0] || 'User'}</span>
        </h1>
      </header>

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          {canCreateProjects && (
            <button
              className={styles.actionCard}
              onClick={() => navigate('/projects/new')}
            >
              <div className={styles.actionIconPrimary}>
                <PlusIcon />
              </div>
              <span className={styles.actionLabel}>New</span>
              <span className={styles.actionSub}>Project</span>
            </button>
          )}

          <button
            className={styles.actionCard}
            onClick={() => navigate('/projects')}
          >
            <div className={styles.actionIconSecondary}>
              <GridIcon />
            </div>
            <span className={styles.actionLabel}>Projects</span>
            <span className={styles.actionSub}>View all</span>
          </button>

          {isAdmin && (
            <button
              className={styles.actionCard}
              onClick={() => navigate('/admin')}
            >
              <div className={styles.actionIconDark}>
                <SettingsIcon />
              </div>
              <span className={styles.actionLabel}>Settings</span>
              <span className={styles.actionSub}>Admin panel</span>
            </button>
          )}
        </div>
      </section>

      {/* Analytics */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Analytics</h2>
        <div className={styles.analyticsGrid}>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsValue}>{activeProjects}</span>
            <span className={styles.analyticsLabel}>Active</span>
          </div>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsValueSuccess}>{completedProjects}</span>
            <span className={styles.analyticsLabel}>Done</span>
          </div>
          <div className={`${styles.analyticsCard} ${styles.deliveredCard}`}>
            <span className={styles.analyticsValue}>{totalDeliverables}</span>
            <span className={styles.analyticsLabel}>Delivered</span>
            <span className={styles.assetsSub}>
              {totalAssets} assets
              {totalBonusAssets > 0 && (
                <span className={styles.bonusText}> +{totalBonusAssets}</span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Project Timeline */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Project Timeline</h2>
        <div className={styles.timelineCard}>
          {/* Legend */}
          <div className={styles.legend}>
            {/* First row: CRITICAL, OVERDUE, URGENT, ON TRACK */}
            <div className={styles.legendRow}>
              {Object.entries(STATUS_COLORS).slice(0, 4).map(([key, { color, label }]) => (
                <span key={key} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ backgroundColor: color }}/>
                  {label}
                </span>
              ))}
            </div>
            {/* Second row: IN PROGRESS, REVIEW, DONE */}
            <div className={styles.legendRow}>
              {Object.entries(STATUS_COLORS).slice(4).map(([key, { color, label }]) => (
                <span key={key} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ backgroundColor: color }}/>
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Month columns */}
          <div className={styles.monthColumns}>
            {monthRange.length === 0 ? (
              <p className={styles.emptyTimeline}>No projects with deadlines</p>
            ) : (
              monthRange.map((monthKey) => {
                const monthProjects = projectsByMonth.get(monthKey) || [];
                return (
                  <div key={monthKey} className={styles.monthColumn}>
                    <div className={styles.monthHeader}>{getMonthLabel(monthKey)}</div>
                    <div className={styles.monthProjects}>
                      {monthProjects.map((project) => (
                        <button
                          key={project.id}
                          className={styles.timelineItem}
                          style={{ backgroundColor: getProjectColor(project) }}
                          onClick={() => zoomToProject(project.id)}
                          onDoubleClick={() => navigate(`/projects?selected=${project.id}`)}
                          title="Click to zoom • Double-click to open"
                        >
                          <span className={styles.timelineName}>{project.name}</span>
                          <span className={styles.timelineDate}>{formatDate(project.dueDate!)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
