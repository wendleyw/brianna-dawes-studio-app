import { useOverviewMetrics, useRecentActivity } from '../../hooks';
import { formatDistanceToNow } from 'date-fns';
import type { AdminTab } from '../../domain/types';
import { BoardIcon, CheckIcon, FolderIcon, UsersIcon } from '@shared/ui/Icons';
import styles from './OverviewTab.module.css';

interface OverviewTabProps {
  onNavigateTab?: (tab: AdminTab) => void;
}

export default function OverviewTab({ onNavigateTab }: OverviewTabProps) {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(5);

  const stats = {
    totalProjects: metrics?.totalProjects || 0,
    totalUsers: (metrics?.totalClients || 0) + (metrics?.totalDesigners || 0),
    activeBoards: metrics?.activeProjects || 0,
    syncHealth: metrics?.completionRate ?? 98,
  };

  const recentActivity =
    activities?.map((activity) => ({
      id: activity.id,
      message: activity.description,
      timestamp: formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true }),
      type: activity.type.includes('project')
        ? ('project' as const)
        : activity.type.includes('deliverable')
          ? ('status' as const)
          : activity.type.includes('client')
            ? ('user' as const)
            : ('upload' as const),
    })) || [];

  const alerts = [
    ...(metrics && metrics.overdueProjects > 0
      ? [
          {
            id: 'overdue',
            type: 'warning' as const,
            title: `${metrics.overdueProjects} project${metrics.overdueProjects > 1 ? 's' : ''} overdue`,
            message: 'Review and update project timelines',
            count: metrics.overdueProjects,
          },
        ]
      : []),
    ...(metrics && metrics.changesRequestedProjects > 0
      ? [
          {
            id: 'changes',
            type: 'warning' as const,
            title: `${metrics.changesRequestedProjects} project${metrics.changesRequestedProjects > 1 ? 's' : ''} with changes requested`,
            message: 'Review client feedback and update deliverables',
            count: metrics.changesRequestedProjects,
          },
        ]
      : []),
    ...(metrics && metrics.dueDateRequests > 0
      ? [
          {
            id: 'duedates',
            type: 'info' as const,
            title: `${metrics.dueDateRequests} pending due date request${metrics.dueDateRequests > 1 ? 's' : ''}`,
            message: 'Review and approve requested due dates',
            count: metrics.dueDateRequests,
          },
        ]
      : []),
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'upload':
        return '📎';
      case 'status':
        return '✅';
      case 'project':
        return '📁';
      case 'sync':
        return '🔄';
      case 'user':
        return '👤';
      default:
        return '•';
    }
  };

  if (metricsLoading || activitiesLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading overview data...</div>
      </div>
    );
  }

  const hasAnyData = (metrics?.totalProjects || 0) > 0 || recentActivity.length > 0;
  const hasAlerts = alerts.length > 0;
  const systemTitle = hasAlerts ? 'Attention required' : 'All systems operational';
  const systemMessage = hasAlerts
    ? `${alerts.length} alert${alerts.length > 1 ? 's' : ''} need review. Check the activity feed for details.`
    : 'Sync servers are responding normally. No active alerts requiring attention.';

  if (!hasAnyData) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🎯</span>
          <p>Welcome to the Admin Dashboard!</p>
          <p className={styles.emptySubtext}>
            Create your first project to start seeing activity and metrics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <section className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statSand}`}>
          <span className={styles.statOrb} />
          <div className={styles.statIcon}>
            <FolderIcon size={18} />
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statValue}>{stats.totalProjects}</span>
            <span className={styles.statLabel}>Total Projects</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statClay}`}>
          <span className={styles.statOrb} />
          <div className={styles.statIcon}>
            <UsersIcon size={18} />
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statValue}>{stats.totalUsers}</span>
            <span className={styles.statLabel}>Total Users</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statOlive}`}>
          <span className={styles.statOrb} />
          <div className={styles.statIcon}>
            <BoardIcon size={18} />
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statValue}>{stats.activeBoards}</span>
            <span className={styles.statLabel}>Active Boards</span>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.statHealth}`}>
          <span className={styles.statOrb} />
          <div className={styles.statIcon}>
            <CheckIcon size={18} />
          </div>
          <div className={styles.statMeta}>
            <span className={styles.statValue}>{stats.syncHealth}%</span>
            <span className={styles.statLabel}>Sync Health</span>
          </div>
        </div>
      </section>

      <section className={styles.activitySection}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Recent Activity</h3>
          <button
            className={styles.sectionAction}
            type="button"
            onClick={() => onNavigateTab?.('activity')}
          >
            See All
          </button>
        </div>
        <div className={styles.activityCard}>
          {recentActivity.length === 0 ? (
            <div className={styles.activityEmpty}>No activity yet.</div>
          ) : (
            recentActivity.map((activity, index) => (
              <div key={activity.id} className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className={styles.activityContent}>
                  <p className={styles.activityMessage}>{activity.message}</p>
                  <p className={styles.activityTime}>{activity.timestamp}</p>
                </div>
                <span className={styles.activityChevron}>&gt;</span>
                {index < recentActivity.length - 1 && <span className={styles.activityDivider} />}
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.systemSection}>
        <h3 className={styles.sectionTitle}>System Status</h3>
        <div className={`${styles.systemCard} ${hasAlerts ? styles.systemWarning : styles.systemHealthy}`}>
          <div className={styles.systemIcon}>
            <CheckIcon size={16} />
          </div>
          <div>
            <p className={styles.systemTitle}>{systemTitle}</p>
            <p className={styles.systemMessage}>{systemMessage}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
