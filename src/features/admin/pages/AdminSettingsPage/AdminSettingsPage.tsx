import { useState } from 'react';
import { Button } from '@shared/ui';
import { UserManagement } from '../../components/UserManagement';
import { BoardManagement } from '../../components/BoardManagement';
import { DeveloperTools } from '../../components/DeveloperTools';
import { SyncHealthDashboard } from '../../components/SyncHealthDashboard';
import { ReportModal } from '../../components/ReportModal';
import type { AdminTab } from '../../domain';
import styles from './AdminSettingsPage.module.css';

// Icons for tabs
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const BoardsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
  </svg>
);

const DeveloperIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6"/>
    <polyline points="8 6 2 12 8 18"/>
  </svg>
);

const SyncIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/>
    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
    <path d="M16 16h5v5"/>
  </svg>
);

const TABS: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
  { id: 'users', label: 'Clients', icon: <UsersIcon /> },
  { id: 'boards', label: 'Boards', icon: <BoardsIcon /> },
  { id: 'sync', label: 'Sync Health', icon: <SyncIcon /> },
  { id: 'developer', label: 'Developer', icon: <DeveloperIcon /> },
];

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div>
            <h1 className={styles.title}>Admin Settings</h1>
            <p className={styles.subtitle}>
              Manage users, board assignments, and application settings
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsReportModalOpen(true)}
            className={styles.reportButton}
          >
            Generate Report
          </Button>
        </div>
      </header>

      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'boards' && <BoardManagement />}
        {activeTab === 'sync' && <SyncHealthDashboard />}
        {activeTab === 'developer' && <DeveloperTools />}
      </div>

      <ReportModal
        open={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
