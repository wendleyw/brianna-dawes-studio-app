import { Outlet } from 'react-router-dom';
import { NotificationBell } from '@features/notifications';
import { useAuth } from '@features/auth';
import styles from './AppShell.module.css';

export function AppShell() {
  const { user } = useAuth();

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.right}>
          <NotificationBell />
          {user && (
            <div className={styles.user}>
              {user.avatarUrl ? (
                <img className={styles.avatar} src={user.avatarUrl} alt={user.name || 'User'} />
              ) : (
                <div className={styles.avatarFallback} aria-hidden>
                  {(user.companyName || user.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
