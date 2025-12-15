import { useState } from 'react';
import type { AdminTab } from '../domain/types';
import OverviewTab from './tabs/OverviewTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import UsersTab from './tabs/UsersTab';
import ProjectsTab from './tabs/ProjectsTab';
import ActivityTab from './tabs/ActivityTab';
import SettingsTab from './tabs/SettingsTab';
import styles from './AdminDashboard.module.css';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'users':
        return <UsersTab />;
      case 'projects':
        return <ProjectsTab />;
      case 'activity':
        return <ActivityTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab />;
    }
  };

  const getNavButtonClass = (tab: AdminTab) => {
    if (activeTab !== tab) return styles.navButton;

    const activeClasses: Record<AdminTab, string | undefined> = {
      overview: styles.overviewActive,
      analytics: styles.analyticsActive,
      users: styles.usersActive,
      projects: styles.projectsActive,
      activity: styles.activityActive,
      settings: styles.settingsActive,
    };

    return `${styles.navButton} ${activeClasses[tab] || ''}`;
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.modal}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}>🎛️</span>
            Admin Dashboard
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dashboard"
          >
            ✕
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.sidebar}>
            <button
              className={getNavButtonClass('overview')}
              onClick={() => setActiveTab('overview')}
            >
              <span className={styles.navIcon}>📊</span>
              Overview
            </button>
            <button
              className={getNavButtonClass('analytics')}
              onClick={() => setActiveTab('analytics')}
            >
              <span className={styles.navIcon}>📈</span>
              Analytics
            </button>
            <button
              className={getNavButtonClass('users')}
              onClick={() => setActiveTab('users')}
            >
              <span className={styles.navIcon}>👥</span>
              Users
            </button>
            <button
              className={getNavButtonClass('projects')}
              onClick={() => setActiveTab('projects')}
            >
              <span className={styles.navIcon}>📁</span>
              Projects
            </button>
            <button
              className={getNavButtonClass('activity')}
              onClick={() => setActiveTab('activity')}
            >
              <span className={styles.navIcon}>🔔</span>
              Activity
            </button>
            <button
              className={getNavButtonClass('settings')}
              onClick={() => setActiveTab('settings')}
            >
              <span className={styles.navIcon}>⚙️</span>
              Settings
            </button>
          </nav>

          <main className={styles.content}>
            {renderContent()}
          </main>
        </div>

        <footer className={styles.footer}>
          <div className={styles.quickActions}>
            <button className={`${styles.quickActionButton} ${styles.primary}`}>
              🔄 Sync All Boards
            </button>
            <button className={styles.quickActionButton}>
              📥 Export Data
            </button>
            <button className={styles.quickActionButton}>
              📢 Send Announcement
            </button>
          </div>
          <div className={styles.lastSyncInfo}>
            Last sync: 2 minutes ago
            <span className={`${styles.syncStatus} ${styles.healthy}`}>
              • Healthy
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
