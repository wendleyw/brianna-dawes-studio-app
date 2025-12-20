import { useState, useMemo } from 'react';
import { useRecentActivity } from '../../hooks';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import styles from './ActivityTab.module.css';

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

  const getActivityColor = (type: string) => {
    if (type.includes('project_created')) return styles.typeProject;
    if (type.includes('project_completed')) return styles.typeSync;
    if (type.includes('deliverable_approved')) return styles.typeApproved;
    if (type.includes('client_joined')) return styles.typeUser;
    if (type.includes('feedback')) return styles.typeComment;
    return '';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-gray-500)' }}>
          Loading activity...
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Activities</option>
            <option value="projects">Projects</option>
            <option value="users">Users</option>
            <option value="deliverables">Deliverables</option>
            <option value="feedback">Feedback</option>
          </select>

          <select
            className={styles.filterSelect}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 days</option>
            <option value="30days">Last 30 days</option>
            <option value="90days">Last 90 days</option>
          </select>
        </div>

        <button className={styles.exportButton}>📥 Export Log</button>
      </div>

      <div className={styles.timeline}>
        {activityLog.today.length > 0 && (
          <div className={styles.timelineSection}>
            <div className={styles.timelineDate}>Today</div>
            <div className={styles.timelineItems}>
              {activityLog.today.map((activity) => (
                <div key={activity.id} className={styles.timelineItem}>
                  <div className={`${styles.timelineIcon} ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineMessage}>
                      {activity.userName && (
                        <span className={styles.timelineUser}>{activity.userName}</span>
                      )}{' '}
                      {activity.description}
                    </div>
                    <div className={styles.timelineTime}>
                      {format(new Date(activity.timestamp), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activityLog.yesterday.length > 0 && (
          <div className={styles.timelineSection}>
            <div className={styles.timelineDate}>Yesterday</div>
            <div className={styles.timelineItems}>
              {activityLog.yesterday.map((activity) => (
                <div key={activity.id} className={styles.timelineItem}>
                  <div className={`${styles.timelineIcon} ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineMessage}>
                      {activity.userName && (
                        <span className={styles.timelineUser}>{activity.userName}</span>
                      )}{' '}
                      {activity.description}
                    </div>
                    <div className={styles.timelineTime}>
                      {format(new Date(activity.timestamp), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activityLog.lastWeek.length > 0 && (
          <div className={styles.timelineSection}>
            <div className={styles.timelineDate}>Earlier</div>
            <div className={styles.timelineItems}>
              {activityLog.lastWeek.map((activity) => (
                <div key={activity.id} className={styles.timelineItem}>
                  <div className={`${styles.timelineIcon} ${getActivityColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineMessage}>
                      {activity.userName && (
                        <span className={styles.timelineUser}>{activity.userName}</span>
                      )}{' '}
                      {activity.description}
                    </div>
                    <div className={styles.timelineTime}>
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activityLog.today.length === 0 &&
          activityLog.yesterday.length === 0 &&
          activityLog.lastWeek.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-gray-500)' }}>
              No recent activity
            </div>
          )}

        <div className={styles.loadMore}>
          <button className={styles.loadMoreButton}>Load More</button>
        </div>
      </div>
    </div>
  );
}
