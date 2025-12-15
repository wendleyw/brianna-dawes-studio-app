import { useOverviewMetrics, useRecentActivity } from '../../hooks';
import { formatDistanceToNow } from 'date-fns';
import styles from './OverviewTab.module.css';

export default function OverviewTab() {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: activities, isLoading: activitiesLoading } = useRecentActivity(5);

  const stats = {
    totalProjects: metrics?.totalProjects || 0,
    totalUsers: (metrics?.totalClients || 0) + (metrics?.totalDesigners || 0),
    activeProjects: metrics?.activeProjects || 0,
    syncHealth: 95, // TODO: Implement real sync health tracking
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

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '•';
    }
  };

  if (metricsLoading || activitiesLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6B7280' }}>
          Loading overview data...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statIcon}>📁</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalProjects}</div>
            <div className={styles.statLabel}>Total Projects</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>👥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.totalUsers}</div>
            <div className={styles.statLabel}>Total Users</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>🔥</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.activeProjects}</div>
            <div className={styles.statLabel}>Active Projects</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statIcon}>💚</div>
          <div className={styles.statContent}>
            <div className={styles.statValue}>{stats.syncHealth}%</div>
            <div className={styles.statLabel}>Sync Health</div>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Recent Activity</h3>
            <button className={styles.sectionAction}>View All</button>
          </div>
          <div className={styles.activityFeed}>
            {recentActivity.map((activity) => (
              <div key={activity.id} className={styles.activityItem}>
                <span className={styles.activityIcon}>
                  {getActivityIcon(activity.type)}
                </span>
                <div className={styles.activityContent}>
                  <div className={styles.activityMessage}>{activity.message}</div>
                  <div className={styles.activityTime}>{activity.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Alerts & Issues</h3>
          </div>
          <div className={styles.alertsList}>
            {alerts.map((alert) => (
              <div key={alert.id} className={`${styles.alertItem} ${styles[alert.type]}`}>
                <div className={styles.alertHeader}>
                  <span className={styles.alertIcon}>{getAlertIcon(alert.type)}</span>
                  <span className={styles.alertTitle}>{alert.title}</span>
                  {alert.count && (
                    <span className={styles.alertBadge}>{alert.count}</span>
                  )}
                </div>
                <div className={styles.alertMessage}>{alert.message}</div>
                <button className={styles.alertAction}>Resolve →</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
