import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminDashboard } from '../../components';

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const [isDashboardOpen, setIsDashboardOpen] = useState(true);

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
        defaultTab="settings"
      />
    </>
  );
}
