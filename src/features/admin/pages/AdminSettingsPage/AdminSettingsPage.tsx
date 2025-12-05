import { useState } from 'react';
import { UserManagement } from '../../components/UserManagement';
import { BoardAssignments } from '../../components/BoardAssignments';
import { AppSettings } from '../../components/AppSettings';
import { DeveloperTools } from '../../components/DeveloperTools';
import type { AdminTab } from '../../domain';
import styles from './AdminSettingsPage.module.css';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'boards', label: 'Board Assignments' },
  { id: 'settings', label: 'App Settings' },
  { id: 'developer', label: 'Developer' },
];

export function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin Settings</h1>
        <p className={styles.subtitle}>
          Manage users, board assignments, and application settings
        </p>
      </header>

      <nav className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.content}>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'boards' && <BoardAssignments />}
        {activeTab === 'settings' && <AppSettings />}
        {activeTab === 'developer' && <DeveloperTools />}
      </div>
    </div>
  );
}
