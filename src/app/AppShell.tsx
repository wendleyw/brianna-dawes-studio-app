import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NotificationBell } from '@features/notifications';
import styles from './AppShell.module.css';

// Icons
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();

  const isProjectsRoute = location.pathname.startsWith('/projects');
  const isNotificationsRoute = location.pathname.startsWith('/notifications');
  const isDashboardRoute = location.pathname === '/' || location.pathname === '/dashboard';
  const showBackButton = isProjectsRoute || isNotificationsRoute;

  return (
    <div className={styles.shell}>
      {!isDashboardRoute && (
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
            <NotificationBell />
          </div>
        </header>
      )}

      <main className={styles.content}>
        <Outlet />
      </main>

    </div>
  );
}
