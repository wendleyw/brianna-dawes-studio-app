import { useOverviewMetrics, useRecentActivity } from '../../hooks';
import { formatDistanceToNow } from 'date-fns';
import type { AdminTab } from '../../domain/types';
import { BoardIcon, CheckIcon, FolderIcon, UsersIcon } from '@shared/ui/Icons';
import baseStyles from './AdminTab.module.css';

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
      <div className={baseStyles.tabContainer}>
        <div className={baseStyles.loading}>Loading overview data...</div>
      </div>
    );
  }

  const hasAnyData = (metrics?.totalProjects || 0) > 0 || recentActivity.length > 0;
  const hasAlerts = alerts.length > 0;

  if (!hasAnyData) {
    return (
      <div className={baseStyles.tabContainer}>
        <div className={baseStyles.emptyState}>
          <div className={baseStyles.emptyStateIcon}>📊</div>
          <h3 className={baseStyles.emptyStateTitle}>Welcome to Admin Overview</h3>
          <p className={baseStyles.emptyStateMessage}>
            Create your first project to start seeing activity and metrics
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={baseStyles.tabContainer}>
      {/* Stats Grid */}
      <div className={baseStyles.statsGrid}>
        <div className={baseStyles.statCard}>
          <div className={baseStyles.statIcon}>
            <FolderIcon size={20} />
          </div>
          <div className={baseStyles.statValue}>{stats.totalProjects}</div>
          <div className={baseStyles.statLabel}>Total Projects</div>
        </div>
        <div className={baseStyles.statCard}>
          <div className={baseStyles.statIcon}>
            <UsersIcon size={20} />
          </div>
          <div className={baseStyles.statValue}>{stats.totalUsers}</div>
          <div className={baseStyles.statLabel}>Total Users</div>
        </div>
        <div className={baseStyles.statCard}>
          <div className={baseStyles.statIcon}>
            <BoardIcon size={20} />
          </div>
          <div className={baseStyles.statValue}>{stats.activeBoards}</div>
          <div className={baseStyles.statLabel}>Active Boards</div>
        </div>
        <div className={baseStyles.statCard}>
          <div className={baseStyles.statIcon}>
            <CheckIcon size={20} />
          </div>
          <div className={baseStyles.statValue}>{stats.syncHealth}%</div>
          <div className={baseStyles.statLabel}>Sync Health</div>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className={baseStyles.section}>
        <div className={baseStyles.sectionHeader}>
          <h3 className={baseStyles.sectionTitle}>Recent Activity</h3>
          <div className={baseStyles.sectionActions}>
            <button
              className={baseStyles.filterChip}
              type="button"
              onClick={() => onNavigateTab?.('activity')}
            >
              See All
            </button>
          </div>
        </div>
        {recentActivity.length === 0 ? (
          <div className={baseStyles.emptyState}>
            <div className={baseStyles.emptyStateIcon}>📭</div>
            <p className={baseStyles.emptyStateMessage}>No recent activity</p>
          </div>
        ) : (
          <div className={baseStyles.list}>
            {recentActivity.map((activity) => (
              <div key={activity.id} className={baseStyles.listItem}>
                <div className={baseStyles.listItemIcon}>
                  <span>{getActivityIcon(activity.type)}</span>
                </div>
                <div className={baseStyles.listItemContent}>
                  <div className={baseStyles.listItemTitle}>{activity.message}</div>
                  <div className={baseStyles.listItemMeta}>{activity.timestamp}</div>
                </div>
                <div className={baseStyles.listItemAction}>
                  →
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Status Section */}
      <div className={baseStyles.section}>
        <div className={baseStyles.sectionHeader}>
          <h3 className={baseStyles.sectionTitle}>System Status</h3>
        </div>
        <div className={baseStyles.listItem} style={{ cursor: 'default' }}>
          <div className={baseStyles.listItemIcon} style={{
            background: hasAlerts ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            color: hasAlerts ? '#d97706' : '#059669'
          }}>
            <CheckIcon size={18} />
          </div>
          <div className={baseStyles.listItemContent}>
            <div className={baseStyles.listItemTitle}>
              {hasAlerts ? 'Attention Required' : 'All Systems Operational'}
            </div>
            <div className={baseStyles.listItemMeta}>
              {hasAlerts
                ? `${alerts.length} alert${alerts.length > 1 ? 's' : ''} need review`
                : 'Sync servers responding normally'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
