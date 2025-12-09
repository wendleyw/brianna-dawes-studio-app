import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TeamManagement } from '../../components/TeamManagement';
import { BoardManagement } from '../../components/BoardManagement';
import { DeveloperTools } from '../../components/DeveloperTools';
import { SyncHealthDashboard } from '../../components/SyncHealthDashboard';
import type { AdminTab } from '../../domain';
import styles from './AdminSettingsPage.module.css';

// Back icon
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 12H5M12 19l-7-7 7-7"/>
  </svg>
);

// Icons for tabs
const TeamIcon = () => (
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
  { id: 'team', label: 'Team', icon: <TeamIcon /> },
  { id: 'boards', label: 'Boards', icon: <BoardsIcon /> },
  { id: 'sync', label: 'Sync Health', icon: <SyncIcon /> },
  { id: 'developer', label: 'Developer', icon: <DeveloperIcon /> },
];

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('team');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/projects')}
            title="Back to Projects"
          >
            <BackIcon />
          </button>
          <div className={styles.headerText}>
            <h1 className={styles.title}>Admin Settings</h1>
            <p className={styles.subtitle}>
              Manage users, board assignments, and application settings
            </p>
          </div>
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
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {activeTab === 'team' && <TeamManagement />}
        {activeTab === 'boards' && <BoardManagement />}
        {activeTab === 'sync' && <SyncHealthDashboard />}
        {activeTab === 'developer' && <DeveloperTools />}
      </div>
    </div>
  );
}
