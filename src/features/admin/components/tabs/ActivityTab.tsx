import { useState } from 'react';
import styles from './ActivityTab.module.css';

export default function ActivityTab() {
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('7days');

  // Mock data grouped by date
  const activityLog = {
    today: [
      {
        id: '1',
        type: 'file_upload',
        user: 'Client Sarah M.',
        message: 'uploaded file.pdf',
        project: 'Logo Redesign',
        time: '14:32',
      },
      {
        id: '2',
        type: 'status_change',
        user: 'Designer John D.',
        message: 'moved task to review',
        project: 'Brand Guide',
        time: '12:15',
      },
      {
        id: '3',
        type: 'project_created',
        user: 'Admin',
        message: 'created new project',
        project: 'Website Redesign',
        time: '10:05',
      },
    ],
    yesterday: [
      {
        id: '4',
        type: 'sync',
        user: 'System',
        message: 'completed Miro board sync',
        project: null,
        time: '18:44',
      },
      {
        id: '5',
        type: 'user_added',
        user: 'Admin',
        message: 'invited new user',
        project: null,
        time: '16:20',
      },
      {
        id: '6',
        type: 'deliverable_approved',
        user: 'Client Corp.',
        message: 'approved deliverable',
        project: 'Business Cards',
        time: '14:55',
      },
    ],
    lastWeek: [
      {
        id: '7',
        type: 'comment',
        user: 'Designer Mike D.',
        message: 'added a comment',
        project: 'App UI/UX',
        time: '3 days ago',
      },
      {
        id: '8',
        type: 'sync_failed',
        user: 'System',
        message: 'sync failed - conflict detected',
        project: 'Logo Redesign',
        time: '4 days ago',
      },
    ],
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'file_upload':
        return '📎';
      case 'status_change':
        return '🔄';
      case 'project_created':
        return '📁';
      case 'sync':
        return '✅';
      case 'sync_failed':
        return '❌';
      case 'user_added':
        return '👤';
      case 'deliverable_approved':
        return '✓';
      case 'comment':
        return '💬';
      default:
        return '•';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'file_upload':
        return styles.typeUpload;
      case 'status_change':
        return styles.typeStatusChange;
      case 'project_created':
        return styles.typeProject;
      case 'sync':
        return styles.typeSync;
      case 'sync_failed':
        return styles.typeSyncFailed;
      case 'user_added':
        return styles.typeUser;
      case 'deliverable_approved':
        return styles.typeApproved;
      case 'comment':
        return styles.typeComment;
      default:
        return '';
    }
  };

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
            <option value="sync">Sync Events</option>
            <option value="files">Files</option>
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
                    <span className={styles.timelineUser}>{activity.user}</span>{' '}
                    {activity.message}
                    {activity.project && (
                      <span className={styles.timelineProject}> in {activity.project}</span>
                    )}
                  </div>
                  <div className={styles.timelineTime}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

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
                    <span className={styles.timelineUser}>{activity.user}</span>{' '}
                    {activity.message}
                    {activity.project && (
                      <span className={styles.timelineProject}> in {activity.project}</span>
                    )}
                  </div>
                  <div className={styles.timelineTime}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.timelineSection}>
          <div className={styles.timelineDate}>Last Week</div>
          <div className={styles.timelineItems}>
            {activityLog.lastWeek.map((activity) => (
              <div key={activity.id} className={styles.timelineItem}>
                <div className={`${styles.timelineIcon} ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className={styles.timelineContent}>
                  <div className={styles.timelineMessage}>
                    <span className={styles.timelineUser}>{activity.user}</span>{' '}
                    {activity.message}
                    {activity.project && (
                      <span className={styles.timelineProject}> in {activity.project}</span>
                    )}
                  </div>
                  <div className={styles.timelineTime}>{activity.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.loadMore}>
          <button className={styles.loadMoreButton}>Load More</button>
        </div>
      </div>
    </div>
  );
}
