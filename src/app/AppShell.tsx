import { Outlet, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { NotificationBell } from '@features/notifications';
import { ReportModal } from '@features/admin/components/ReportModal';
import { useAuth } from '@features/auth';
import { useMiro } from '@features/boards';
import styles from './AppShell.module.css';

// Icons
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

export function AppShell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { miro, isInMiro } = useMiro();
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

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
            <>
              <button
                className={styles.adminButton}
                onClick={handleOpenBoardModal}
                title="Project Status Board"
              >
                <GridIcon />
                <span>Status</span>
              </button>
              <button
                className={styles.adminButton}
                onClick={() => setIsReportModalOpen(true)}
                title="Generate Report"
              >
                <ReportIcon />
                <span>Report</span>
              </button>
              <button
                className={styles.adminButton}
                onClick={() => navigate('/admin')}
                title="Admin Settings"
              >
                <SettingsIcon />
                <span>Settings</span>
              </button>
            </>
          )}
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

      {/* Report Modal */}
      <ReportModal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
