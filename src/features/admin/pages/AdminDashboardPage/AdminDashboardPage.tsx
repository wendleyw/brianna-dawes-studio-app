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

  const handleOpenModal = useCallback(async (tab: AdminTab) => {
    if (!miro || !isInMiro) return;
    try {
      await miro.board.ui.openModal({
        url: `admin-modal.html?tab=${encodeURIComponent(tab)}`,
        width: 1200,
        height: 800,
        fullscreen: false,
      });
    } catch (error) {
      console.error('Failed to open admin modal', error);
    }
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
        onOpenModal={!isModalHost && isInMiro ? handleOpenModal : undefined}
      />
    </>
  );
}
