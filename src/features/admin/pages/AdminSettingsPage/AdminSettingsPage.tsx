import { useState } from 'react';
import { AdminDashboard } from '../../components';

export function AdminSettingsPage() {
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

  return (
    <>
      <AdminDashboard isOpen={isDashboardOpen} onClose={() => setIsDashboardOpen(false)} />
    </>
  );
}
