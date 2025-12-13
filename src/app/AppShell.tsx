import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { NotificationBell } from '@features/notifications';
import { useAuth } from '@features/auth';
import { useMiro } from '@features/boards';
import styles from './AppShell.module.css';

// Icons
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M7 15v-5" />
    <path d="M12 15v-9" />
    <path d="M17 15v-3" />
  </svg>
);

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { miro, isInMiro } = useMiro();

  const isAdmin = user?.role === 'admin';
  const isProjectsRoute = location.pathname.startsWith('/projects');
  const isNotificationsRoute = location.pathname.startsWith('/notifications');
  const showBackButton = isProjectsRoute || isNotificationsRoute;

  const handleOpenAnalyticsModal = useCallback(async () => {
    if (miro && isInMiro) {
      try {
        await miro.board.ui.openModal({
          url: 'admin-modal.html',
          width: 1200,
          height: 800,
          fullscreen: false,
        });
      } catch (error) {
        console.error('Failed to open analytics modal', error);
      }
      return;
    }
    navigate('/admin/dashboard');
  }, [miro, isInMiro, navigate]);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.left}>
          {showBackButton && (
            <button
              className={styles.backToDashboard}
              onClick={() => {
                if (isProjectsRoute) navigate('/dashboard');
                else navigate(-1);
              }}
              title={isProjectsRoute ? 'Back to Dashboard' : 'Back'}
              aria-label={isProjectsRoute ? 'Back to Dashboard' : 'Back'}
              type="button"
            >
              <BackIcon />
            </button>
          )}
        </div>
        <div className={styles.right}>
          {isAdmin && (
            <div className={styles.adminMenuWrap}>
              <button
                className={styles.adminToggle}
                onClick={handleOpenAnalyticsModal}
                aria-label="Analytics"
                type="button"
                title="Analytics"
              >
                <AnalyticsIcon />
              </button>
            </div>
          )}
          <NotificationBell />
        </div>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
