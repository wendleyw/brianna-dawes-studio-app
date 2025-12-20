import { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../../components';
import type { AdminTab } from '../../domain/types';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

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
    if (location.pathname === '/admin') return 'settings';
    return 'analytics';
  }, [location.search, location.pathname]);

  useEffect(() => {
    if (!isDashboardOpen) {
      navigate('/dashboard');
    }
  }, [isDashboardOpen, navigate]);

  return (
    <>
      <AdminDashboard
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        defaultTab={defaultTab}
      />
    </>
  );
}
