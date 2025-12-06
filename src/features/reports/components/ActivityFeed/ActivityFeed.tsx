import { memo } from 'react';
import { Skeleton } from '@shared/ui';
import { useRecentActivity } from '../../hooks/useRecentActivity';
import { formatRelativeTime } from '@shared/lib/dateFormat';
import styles from './ActivityFeed.module.css';

const ACTIVITY_CONFIG: Record<string, { label: string; iconClass: string }> = {
  deliverable_created: { label: 'created', iconClass: styles.iconDeliverable || '' },
  version_uploaded: { label: 'uploaded version of', iconClass: styles.iconVersion || '' },
  feedback_added: { label: 'commented on', iconClass: styles.iconFeedback || '' },
  status_changed: { label: 'updated status of', iconClass: styles.iconStatus || '' },
  project_created: { label: 'created project', iconClass: styles.iconDeliverable || '' },
};

const ACTIVITY_ICONS: Record<string, React.ReactElement> = {
  deliverable_created: (
    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  version_uploaded: (
    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  ),
  feedback_added: (
    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  status_changed: (
    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  project_created: (
    <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
};

// formatRelativeTime imported from @shared/lib/dateFormat

interface ActivityFeedProps {
  limit?: number;
}

/**
 * ActivityFeed - Displays recent activity items
 * Memoized to prevent unnecessary re-renders in dashboard
 */
export const ActivityFeed = memo(function ActivityFeed({ limit = 20 }: ActivityFeedProps) {
  const { data: activities, isLoading } = useRecentActivity(limit);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3 className={styles.title}>Recent Activity</h3>
        </div>
        <div className={styles.loading}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} height={60} style={{ marginBottom: 8 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Recent Activity</h3>
      </div>

      {!activities || activities.length === 0 ? (
        <div className={styles.empty}>No recent activity</div>
      ) : (
        <div className={styles.list}>
          {activities.map((activity) => {
            const config = ACTIVITY_CONFIG[activity.type] || { label: 'updated', iconClass: '' };

            return (
              <div key={`${activity.id}-${activity.timestamp}`} className={styles.item}>
                <div className={`${styles.iconWrapper} ${config.iconClass || ''}`}>
                  {ACTIVITY_ICONS[activity.type]}
                </div>
                <div className={styles.content}>
                  <p className={styles.text}>
                    {activity.userName && (
                      <span className={styles.textHighlight}>{activity.userName} </span>
                    )}
                    {config.label || 'updated'}{' '}
                    <span className={styles.textHighlight}>{activity.itemName}</span>
                  </p>
                  <div className={styles.meta}>
                    <span>{activity.projectName}</span>
                    <span>•</span>
                    <span className={styles.time}>{formatRelativeTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
