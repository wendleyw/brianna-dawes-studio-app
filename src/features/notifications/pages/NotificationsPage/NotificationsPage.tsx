import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/ui';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '@shared/lib/dateFormat';
import { getNotificationIcon } from '../../components/notificationIcons';
import type { Notification } from '../../domain/notification.types';

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

    const reportId = notification.data?.reportId;
    if (reportId) {
      navigate(`/reports/${reportId}`);
      return;
    }

    const projectId = notification.data?.projectId;
    if (projectId) {
      navigate(`/projects/${projectId}`);
    }
  };

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading notifications...</div>;
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', color: '#050038' }}>
              Notifications
            </h1>
            <p style={{ color: '#666' }}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All notifications are up to date'}
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Home
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant={unreadOnly ? 'primary' : 'ghost'}
            onClick={() => setUnreadOnly((v) => !v)}
          >
            {unreadOnly ? 'Show All' : 'Unread Only'}
          </Button>
          <Button size="sm" variant="ghost" onClick={refresh}>
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" onClick={markAllAsRead}>
              Mark All Read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearAll} style={{ color: '#EF4444' }}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {visibleNotifications.length === 0 ? (
        <div
          style={{
            padding: '64px',
            textAlign: 'center',
            border: '2px dashed #ddd',
            borderRadius: '8px',
          }}
        >
          <p style={{ fontSize: '18px', color: '#999', marginBottom: '8px' }}>
            {unreadOnly ? 'No unread notifications' : 'No notifications'}
          </p>
          <p style={{ fontSize: '14px', color: '#ccc' }}>
            {unreadOnly
              ? 'All caught up! Check back later for updates.'
              : 'Notifications about projects, deliverables, and updates will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleNotifications.map((n) => (
              <div
                key={n.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  backgroundColor: n.isRead ? '#fff' : '#f0f9ff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div onClick={() => handleOpen(n)}>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: n.isRead ? '#f3f4f6' : '#dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getNotificationIcon(n.type)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#050038' }}>
                          {n.title}
                        </h3>
                        <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0, marginLeft: '8px' }}>
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{n.message}</p>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', paddingLeft: '52px' }}>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => markAsRead(n.id)}
                      style={{
                        fontSize: '12px',
                        color: '#2563EB',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                      }}
                    >
                      Mark as read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteNotification(n.id)}
                    style={{
                      fontSize: '12px',
                      color: '#EF4444',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 8px',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {hasMore && !unreadOnly && (
            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Button onClick={loadMore} isLoading={isLoadingMore} variant="secondary">
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
