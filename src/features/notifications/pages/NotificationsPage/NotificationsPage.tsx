import { useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Logo } from '@shared/ui';
import { ArrowLeftIcon, ChevronDownIcon } from '@shared/ui/Icons';
import { useAuth } from '@features/auth';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelativeTime } from '@shared/lib/dateFormat';
import { getNotificationIcon } from '../../components/notificationIcons';
import type { Notification } from '../../domain/notification.types';
import styles from './NotificationsPage.module.css';

// Icons for bottom nav
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7" />
    <path d="M9 22V12h6v10" />
    <path d="M21 22H3" />
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const TeamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navRef = useRef<HTMLElement>(null);
  const [isNavExpanded, setIsNavExpanded] = useState(true);

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
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate('/dashboard')}
              aria-label="Back to dashboard"
            >
              <ArrowLeftIcon size={18} />
            </button>
            <h1 className={styles.headerTitle}>Notifications</h1>
          </div>
          <Logo size="sm" />
        </header>
        <div className={styles.content}>
          <div className={styles.empty}>Loading notifications...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate('/dashboard')}
            aria-label="Back to dashboard"
          >
            <ArrowLeftIcon size={18} />
          </button>
          <h1 className={styles.headerTitle}>Notifications</h1>
        </div>
        <Logo size="sm" />
      </header>

      {/* Content */}
      <div className={styles.content}>
        <div className={styles.headerRow}>
          <div className={styles.titleBlock}>
            <p className={styles.subtitle}>
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                : 'All notifications are up to date'}
            </p>
          </div>
        </div>

        <div className={styles.actions}>
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

        {visibleNotifications.length === 0 ? (
          <div className={styles.empty}>
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>
              {unreadOnly ? 'No unread notifications' : 'No notifications'}
            </p>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>
              {unreadOnly
                ? 'All caught up! Check back later for updates.'
                : 'Notifications about projects, deliverables, and updates will appear here.'}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {visibleNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`${styles.item} ${!n.isRead ? styles.itemUnread : ''}`}
                >
                  <button type="button" className={styles.itemMain} onClick={() => handleOpen(n)}>
                    <div className={styles.itemIcon}>
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className={styles.itemBody}>
                      <div className={styles.itemTopRow}>
                        <span className={styles.itemTitle}>{n.title}</span>
                        <span className={styles.itemTime}>{formatRelativeTime(n.createdAt)}</span>
                      </div>
                      <p className={styles.itemMessage}>{n.message}</p>
                    </div>
                  </button>
                  <div className={styles.itemActions}>
                    {!n.isRead && (
                      <button
                        type="button"
                        className={styles.actionLink}
                        onClick={() => markAsRead(n.id)}
                      >
                        Mark as read
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.actionLinkDanger}
                      onClick={() => deleteNotification(n.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && !unreadOnly && (
              <div className={styles.loadMoreRow}>
                <Button onClick={loadMore} isLoading={isLoadingMore} variant="secondary">
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav
        ref={navRef}
        className={`${styles.bottomNav} ${!isNavExpanded ? styles.bottomNavCollapsed : ''}`}
        aria-label="Primary"
      >
        <button
          type="button"
          className={styles.navToggle}
          aria-label={isNavExpanded ? 'Collapse menu' : 'Expand menu'}
          aria-expanded={isNavExpanded}
          onClick={() => setIsNavExpanded((prev) => !prev)}
        >
          <span className={styles.navIcon}>
            <ChevronDownIcon isOpen={isNavExpanded} />
          </span>
        </button>
        <div className={styles.navItems}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => navigate('/dashboard')}
          >
            <span className={styles.navIcon}>
              <HomeIcon />
            </span>
            <span>Home</span>
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => navigate('/projects')}
          >
            <span className={styles.navIcon}>
              <FolderIcon />
            </span>
            <span>Projects</span>
          </button>
          {!isAdmin && (
            <button
              type="button"
              className={styles.navButton}
              onClick={() => navigate('/reports')}
            >
              <span className={styles.navIcon}>
                <FileTextIcon />
              </span>
              <span>Reports</span>
            </button>
          )}
          <button
            type="button"
            className={`${styles.navButton} ${!isAdmin ? styles.navButtonDisabled : ''}`}
            onClick={() => {
              if (isAdmin) navigate('/admin?tab=users');
            }}
            aria-disabled={!isAdmin}
            disabled={!isAdmin}
          >
            <span className={styles.navIcon}>
              <TeamIcon />
            </span>
            <span>Team</span>
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonActive}`}
            onClick={() => navigate('/notifications')}
            aria-current="page"
          >
            <span className={styles.navIcon}>
              <BellIcon />
            </span>
            <span>Notifications</span>
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${!isAdmin ? styles.navButtonDisabled : ''}`}
            onClick={() => {
              if (isAdmin) navigate('/admin?tab=settings');
            }}
            aria-disabled={!isAdmin}
            disabled={!isAdmin}
          >
            <span className={styles.navIcon}>
              <SettingsIcon />
            </span>
            <span>Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
