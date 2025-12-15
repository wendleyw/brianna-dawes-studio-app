import styles from './OverviewTab.module.css';

export default function OverviewTab() {
  // Mock data - será substituído por hooks de dados reais
  const stats = {
    totalProjects: 24,
    totalUsers: 12,
    activeProjects: 8,
    syncHealth: 95,
  };

  const recentActivity = [
    {
      id: '1',
      message: 'Client Sarah M. uploaded file.pdf to Logo Redesign',
      timestamp: '2 minutes ago',
      type: 'upload' as const,
    },
    {
      id: '2',
      message: 'Designer John D. moved deliverable to done',
      timestamp: '15 minutes ago',
      type: 'status' as const,
    },
    {
      id: '3',
      message: 'Admin created new project: Brand Identity',
      timestamp: '1 hour ago',
      type: 'project' as const,
    },
    {
      id: '4',
      message: 'Miro board sync completed successfully',
      timestamp: '2 hours ago',
      type: 'sync' as const,
    },
    {
      id: '5',
      message: 'New user Client X invited to platform',
      timestamp: '3 hours ago',
      type: 'user' as const,
    },
  ];

  const alerts = [
    {
      id: '1',
      type: 'warning' as const,
      title: '3 projects overdue',
      message: 'Logo Redesign, Brand Guide, Website Mockups',
      count: 3,
    },
    {
      id: '2',
      type: 'warning' as const,
      title: '2 sync conflicts',
      message: 'Manual resolution required',
      count: 2,
    },
    {
      id: '3',
      type: 'info' as const,
      title: '5 pending user invitations',
      message: 'Awaiting acceptance',
      count: 5,
    },
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
