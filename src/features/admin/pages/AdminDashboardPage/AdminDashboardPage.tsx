import { useMemo, useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../../components';
import type { AdminTab } from '../../domain/types';
import { useMiro } from '@features/boards';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);
  const { miro, isInMiro } = useMiro();
  const isModalHost = location.pathname.includes('admin-modal');
  const modalMode = new URLSearchParams(location.search).get('mode');
  const isExplicitModal = modalMode === 'modal';

  const defaultTab = useMemo<AdminTab>(() => {
    const tab = new URLSearchParams(location.search).get('tab');
    const allowedTabs: AdminTab[] = [
      'overview',
      'analytics',
      'team',
      'boards',
      'projects',
      'activity',
      'system',
      'settings',
    ];
    if (tab && allowedTabs.includes(tab as AdminTab)) return tab as AdminTab;
    if (location.pathname === '/admin') return 'overview';
    return 'analytics';
  }, [location.search, location.pathname]);

  useEffect(() => {
    if (!isDashboardOpen) {
      navigate('/dashboard');
    }
  }, [isDashboardOpen, navigate]);

  useEffect(() => {
    if (!isModalHost || isExplicitModal || !miro || !isInMiro) return;

    const tabParam = new URLSearchParams(location.search).get('tab') || 'overview';
    miro.board.ui.openPanel({
      url: `app.html?adminTab=${encodeURIComponent(tabParam)}`,
      height: 760,
    })
      .then(() => miro.board.ui.closeModal())
      .catch((error) => {
        console.error('Failed to redirect admin modal to panel', error);
      });
  }, [isModalHost, isExplicitModal, miro, isInMiro, location.search]);

  const handleOpenModal = useCallback((tab: AdminTab) => {
    if (!miro || !isInMiro) return;
    miro.board.ui
      .openModal({
        url: `admin-modal.html?tab=${encodeURIComponent(tab)}&mode=modal`,
        width: 1280,
        height: 920,
        fullscreen: false,
      })
      .catch((error) => {
        console.error('Failed to open admin modal', error);
      });
  }, [miro, isInMiro]);

  const handleClose = useCallback(() => {
    if (isModalHost && miro && isInMiro) {
      miro.board.ui.closeModal().catch((error) => {
        console.error('Failed to close admin modal', error);
      });
      return;
    }
    setIsDashboardOpen(false);
  }, [isModalHost, miro, isInMiro]);

  return (
    <>
      <AdminDashboard
        isOpen={isDashboardOpen}
        onClose={handleClose}
        defaultTab={defaultTab}
        variant="panel"
        {...(!isModalHost && isInMiro ? { onOpenModal: handleOpenModal } : {})}
      />
    </>
  );
}
