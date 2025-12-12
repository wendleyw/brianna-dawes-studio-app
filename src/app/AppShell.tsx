import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { NotificationBell } from '@features/notifications';
import { ReportModal } from '@features/admin/components/ReportModal';
import { useAuth } from '@features/auth';
import { useMiro } from '@features/boards';
import styles from './AppShell.module.css';

// Icons
const BackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const ReportIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const AdminMenuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { miro, isInMiro } = useMiro();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = user?.role === 'admin';
  const showBackToDashboard = location.pathname.startsWith('/projects');

  useEffect(() => {
    if (!isAdminMenuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAdminMenuOpen(false);
    };

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (adminMenuRef.current && !adminMenuRef.current.contains(target)) {
        setIsAdminMenuOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isAdminMenuOpen]);

  // Handler to open project board modal
  const handleOpenBoardModal = useCallback(async () => {
    if (miro && isInMiro) {
      try {
        await miro.board.ui.openModal({
          url: 'board-modal.html',
          width: 1200,
          height: 800,
          fullscreen: false,
        });
      } catch (error) {
        console.error('Failed to open board modal', error);
      }
    }
  }, [miro, isInMiro]);

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.right}>
          {/* Admin Quick Actions */}
          {isAdmin && (
            <div className={styles.adminMenuWrap} ref={adminMenuRef}>
              <button
                className={styles.adminToggle}
                onClick={() => setIsAdminMenuOpen(v => !v)}
                aria-label="Admin quick actions"
                aria-expanded={isAdminMenuOpen}
                type="button"
                title="Admin"
              >
                <AdminMenuIcon />
              </button>
              {isAdminMenuOpen && (
                <div className={styles.adminMenu} role="menu" aria-label="Admin quick actions">
                  <button
                    className={styles.adminMenuItem}
                    onClick={async () => {
                      setIsAdminMenuOpen(false);
                      await handleOpenBoardModal();
                    }}
                    type="button"
                    role="menuitem"
                  >
                    <GridIcon />
                    <span>Status</span>
                  </button>
                  <button
                    className={styles.adminMenuItem}
                    onClick={() => {
                      setIsAdminMenuOpen(false);
                      setIsReportModalOpen(true);
                    }}
                    type="button"
                    role="menuitem"
                  >
                    <ReportIcon />
                    <span>Report</span>
                  </button>
                  <button
                    className={styles.adminMenuItem}
                    onClick={() => {
                      setIsAdminMenuOpen(false);
                      navigate('/admin');
                    }}
                    type="button"
                    role="menuitem"
                  >
                    <SettingsIcon />
                    <span>Settings</span>
                  </button>
                </div>
              )}
            </div>
          )}
          <NotificationBell />
          {showBackToDashboard && (
            <button
              className={styles.backToDashboard}
              onClick={() => navigate('/dashboard')}
              title="Back to Dashboard"
              aria-label="Back to Dashboard"
              type="button"
            >
              <BackIcon />
            </button>
          )}
        </div>
      </header>

      <main className={styles.content}>
        <Outlet />
      </main>

      {/* Report Modal */}
      <ReportModal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
