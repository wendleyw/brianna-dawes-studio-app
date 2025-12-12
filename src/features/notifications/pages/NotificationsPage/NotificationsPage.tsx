import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Skeleton } from '@shared/ui';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '@shared/lib/dateFormat';
import { getNotificationIcon } from '../../components/notificationIcons';
import type { Notification } from '../../domain/notification.types';
import styles from './NotificationsPage.module.css';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading, isLoadingMore, hasMore, refresh, loadMore, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const visibleNotifications = useMemo(() => {
    if (!unreadOnly) return notifications;
    return notifications.filter((n) => !n.isRead);
  }, [notifications, unreadOnly]);

  const handleOpen = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }

    const projectId = notification.data?.projectId;
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <Skeleton width={180} height={24} />
          <Skeleton width={220} height={32} />
        </div>
        <Skeleton width="100%" height={72} />
        <Skeleton width="100%" height={72} />
        <Skeleton width="100%" height={72} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>Notifications</h1>
          <div className={styles.subtitle}>
            {unreadCount} unread
          </div>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.filterChip} ${unreadOnly ? styles.filterChipActive : ''}`}
            onClick={() => setUnreadOnly((v) => !v)}
          >
            Unread only
          </button>
          <Button size="sm" variant="ghost" onClick={refresh}>
            Refresh
          </Button>
          <Button size="sm" variant="secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
          <Button size="sm" variant="danger" onClick={clearAll} disabled={notifications.length === 0}>
            Clear all
          </Button>
        </div>
      </div>

      {visibleNotifications.length === 0 ? (
        <div className={styles.empty}>
          {unreadOnly ? 'No unread notifications' : 'No notifications'}
        </div>
      ) : (
        <div className={styles.list} role="list">
          {visibleNotifications.map((n) => (
            <div
              key={n.id}
              className={`${styles.item} ${!n.isRead ? styles.itemUnread : ''}`}
              role="listitem"
            >
              <button type="button" className={styles.itemMain} onClick={() => handleOpen(n)}>
                <div className={styles.itemIcon}>{getNotificationIcon(n.type)}</div>
                <div className={styles.itemBody}>
                  <div className={styles.itemTopRow}>
                    <div className={styles.itemTitle}>{n.title}</div>
                    <div className={styles.itemTime}>{formatRelativeTime(n.createdAt)}</div>
                  </div>
                  <div className={styles.itemMessage}>{n.message}</div>
                </div>
              </button>
              <div className={styles.itemActions}>
                {!n.isRead && (
                  <button type="button" className={styles.actionLink} onClick={() => markAsRead(n.id)}>
                    Mark read
                  </button>
                )}
                <button type="button" className={styles.actionLinkDanger} onClick={() => deleteNotification(n.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasMore && !unreadOnly && (
        <div className={styles.loadMoreRow}>
          <Button onClick={loadMore} isLoading={isLoadingMore} variant="secondary">
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

