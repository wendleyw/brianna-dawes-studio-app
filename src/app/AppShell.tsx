import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '@shared/ui';
import { NotificationBell } from '@features/notifications';
import { useAuth } from '@features/auth';
import { ROLE_CONFIG } from '@shared/config/roleConfig';
import styles from './AppShell.module.css';

function getRouteTitle(pathname: string): string {
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  if (pathname.startsWith('/projects/new')) return 'Create Project';
  if (pathname.match(/^\/projects\/[^/]+\/edit/)) return 'Edit Project';
  if (pathname.match(/^\/projects\/[^/]+$/)) return 'Project Details';
  if (pathname.startsWith('/projects')) return 'Projects';
  if (pathname.startsWith('/notifications')) return 'Notifications';
  if (pathname.startsWith('/admin/dashboard')) return 'Admin Dashboard';
  if (pathname.startsWith('/admin')) return 'Admin Settings';
  if (pathname.startsWith('/board/')) return 'Board';
  return 'Brianna Dawes Studio';
}

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const title = getRouteTitle(location.pathname);
  const showBack = location.pathname !== '/' && location.pathname !== '/dashboard';

  const isActive = (to: string) =>
    location.pathname === to ||
    location.pathname.startsWith(`${to}/`) ||
    (to === '/projects' && location.pathname.startsWith('/projects'));

  const roleConfig = user ? ROLE_CONFIG[user.role] : null;

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.left}>
          {showBack && (
            <button
              className={styles.backButton}
              onClick={() => navigate(-1)}
              aria-label="Go back"
              title="Back"
              type="button"
            >
              <span className={styles.backChevron} aria-hidden>
                ‹
              </span>
            </button>
          )}
          <Link to="/" className={styles.logoLink} aria-label="Go to dashboard">
            <Logo size="sm" />
          </Link>
          <div className={styles.title} title={title}>
            {title}
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          <Link
            className={`${styles.navLink} ${isActive('/dashboard') || location.pathname === '/' ? styles.navLinkActive : ''}`}
            to="/dashboard"
          >
            Dashboard
          </Link>
          <Link
            className={`${styles.navLink} ${isActive('/projects') ? styles.navLinkActive : ''}`}
            to="/projects"
          >
            Projects
          </Link>
          <Link
            className={`${styles.navLink} ${isActive('/notifications') ? styles.navLinkActive : ''}`}
            to="/notifications"
          >
            Notifications
          </Link>
          {user?.role === 'admin' && (
            <Link
              className={`${styles.navLink} ${isActive('/admin') ? styles.navLinkActive : ''}`}
              to="/admin"
            >
              Admin
            </Link>
          )}
        </nav>

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
              <div className={styles.userMeta}>
                <div className={styles.userName}>{user.companyName || user.name}</div>
                {roleConfig && (
                  <div
                    className={styles.userRole}
                    style={{ color: roleConfig.color, backgroundColor: roleConfig.bgColor }}
                  >
                    {roleConfig.label}
                  </div>
                )}
              </div>
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
