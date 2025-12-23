import { useState, useMemo } from 'react';
import { useRecentActivity } from '../../hooks';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import baseStyles from './AdminTab.module.css';

export default function ActivityTab() {
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');

  const limitMap = {
    today: 20,
    '7days': 50,
    '30days': 100,
    '90days': 200,
  };

  const { data: activities, isLoading } = useRecentActivity(
    limitMap[dateRange as keyof typeof limitMap] || 50
  );

  const activityLog = useMemo(() => {
    if (!activities) return { today: [], yesterday: [], lastWeek: [] };

    const filtered = activities.filter((activity) => {
      if (filterType === 'all') return true;
      if (filterType === 'projects' && activity.type.includes('project')) return true;
      if (filterType === 'users' && activity.type.includes('client')) return true;
      if (filterType === 'deliverables' && activity.type.includes('deliverable')) return true;
      if (filterType === 'feedback' && activity.type.includes('feedback')) return true;
      return false;
    });

    const grouped = {
      today: [] as typeof activities,
      yesterday: [] as typeof activities,
      lastWeek: [] as typeof activities,
    };

    filtered.forEach((activity) => {
      const activityDate = new Date(activity.timestamp);
      if (isToday(activityDate)) {
        grouped.today.push(activity);
      } else if (isYesterday(activityDate)) {
        grouped.yesterday.push(activity);
      } else {
        grouped.lastWeek.push(activity);
      }
    });

    return grouped;
  }, [activities, filterType]);

  const getActivityIcon = (type: string) => {
    if (type.includes('project_created')) return '📁';
    if (type.includes('project_completed')) return '✅';
    if (type.includes('deliverable_approved')) return '✓';
    if (type.includes('client_joined')) return '👤';
    if (type.includes('feedback')) return '💬';
    return '•';
  };


  if (isLoading) {
    return (
      <div className={baseStyles.tabContainer}>
        <div className={baseStyles.loading}>Loading activity...</div>
      </div>
    );
  }

  const hasActivity = activityLog.today.length > 0 || activityLog.yesterday.length > 0 || activityLog.lastWeek.length > 0;

  return (
    <div className={baseStyles.tabContainer}>
      {/* Tab Header with Filters */}
      <div className={baseStyles.tabHeader}>
        <div className={baseStyles.tabHeaderMain}>
          <h2 className={baseStyles.tabTitle}>Activity Log</h2>
          <p className={baseStyles.tabSubtitle}>Track all system events and user actions</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={filterType === 'all' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setFilterType('all')}
        >
          All
        </button>
        <button
          className={filterType === 'projects' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setFilterType('projects')}
        >
          Projects
        </button>
        <button
          className={filterType === 'users' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setFilterType('users')}
        >
          Users
        </button>
        <button
          className={filterType === 'deliverables' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setFilterType('deliverables')}
        >
          Deliverables
        </button>
        <button
          className={filterType === 'feedback' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setFilterType('feedback')}
        >
          Feedback
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            className={dateRange === '7days' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
            onClick={() => setDateRange('7days')}
          >
            7 days
          </button>
          <button
            className={dateRange === '30days' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
            onClick={() => setDateRange('30days')}
          >
            30 days
          </button>
        </div>
      </div>

      {!hasActivity && (
        <div className={baseStyles.emptyState}>
          <div className={baseStyles.emptyStateIcon}>📭</div>
          <h3 className={baseStyles.emptyStateTitle}>No Activity Found</h3>
          <p className={baseStyles.emptyStateMessage}>Try adjusting your filters or date range</p>
        </div>
      )}

      {/* Today Section */}
      {activityLog.today.length > 0 && (
        <div className={baseStyles.section}>
          <div className={baseStyles.sectionHeader}>
            <h3 className={baseStyles.sectionTitle}>Today</h3>
          </div>
          <div className={baseStyles.list}>
            {activityLog.today.map((activity) => (
              <div key={activity.id} className={baseStyles.listItem}>
                <div className={baseStyles.listItemIcon}>
                  <span>{getActivityIcon(activity.type)}</span>
                </div>
                <div className={baseStyles.listItemContent}>
                  <div className={baseStyles.listItemTitle}>
                    {activity.userName && <strong>{activity.userName}</strong>}{' '}
                    {activity.description}
                  </div>
                  <div className={baseStyles.listItemMeta}>
                    {format(new Date(activity.timestamp), 'HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yesterday Section */}
      {activityLog.yesterday.length > 0 && (
        <div className={baseStyles.section}>
          <div className={baseStyles.sectionHeader}>
            <h3 className={baseStyles.sectionTitle}>Yesterday</h3>
          </div>
          <div className={baseStyles.list}>
            {activityLog.yesterday.map((activity) => (
              <div key={activity.id} className={baseStyles.listItem}>
                <div className={baseStyles.listItemIcon}>
                  <span>{getActivityIcon(activity.type)}</span>
                </div>
                <div className={baseStyles.listItemContent}>
                  <div className={baseStyles.listItemTitle}>
                    {activity.userName && <strong>{activity.userName}</strong>}{' '}
                    {activity.description}
                  </div>
                  <div className={baseStyles.listItemMeta}>
                    {format(new Date(activity.timestamp), 'HH:mm')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Earlier Section */}
      {activityLog.lastWeek.length > 0 && (
        <div className={baseStyles.section}>
          <div className={baseStyles.sectionHeader}>
            <h3 className={baseStyles.sectionTitle}>Earlier</h3>
          </div>
          <div className={baseStyles.list}>
            {activityLog.lastWeek.map((activity) => (
              <div key={activity.id} className={baseStyles.listItem}>
                <div className={baseStyles.listItemIcon}>
                  <span>{getActivityIcon(activity.type)}</span>
                </div>
                <div className={baseStyles.listItemContent}>
                  <div className={baseStyles.listItemTitle}>
                    {activity.userName && <strong>{activity.userName}</strong>}{' '}
                    {activity.description}
                  </div>
                  <div className={baseStyles.listItemMeta}>
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
