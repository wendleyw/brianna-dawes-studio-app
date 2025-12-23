import { useState, useEffect } from 'react';
import type { AdminTab } from '../domain/types';
import OverviewTab from './tabs/OverviewTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import ProjectsTab from './tabs/ProjectsTab';
import ActivityTab from './tabs/ActivityTab';
import SystemTab from './tabs/SystemTab';
import { TeamManagement } from './TeamManagement';
import { BoardManagement } from './BoardManagement';
import { AppSettings } from './AppSettings';
import { ProjectTypesSettings } from './ProjectTypesSettings';
import {
  CloseIcon,
  DashboardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  BoardIcon,
  ChartIcon,
  MessageIcon,
  SyncIcon,
} from '@shared/ui/Icons';
import styles from './AdminDashboard.module.css';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AdminTab;
  variant?: 'modal' | 'panel';
  onOpenModal?: (tab: AdminTab) => void;
  onOpenStatus?: () => void;
  onOpenReport?: () => void;
}

export default function AdminDashboard({
  isOpen,
  onClose,
  defaultTab = 'overview',
  variant = 'modal',
  onOpenModal,
  onOpenStatus,
  onOpenReport,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  const isPanel = variant === 'panel';

  // Reset to defaultTab when modal reopens or defaultTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab onNavigateTab={setActiveTab} />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'team':
        return <TeamManagement />;
      case 'boards':
        return <BoardManagement />;
      case 'projects':
        return <ProjectsTab />;
      case 'activity':
        return <ActivityTab />;
      case 'system':
        return <SystemTab />;
      case 'settings':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <ProjectTypesSettings />
            <AppSettings />
          </div>
        );
      default:
        return <OverviewTab onNavigateTab={setActiveTab} />;
    }
  };

  const getNavButtonClass = (tab: AdminTab) => {
    return activeTab === tab
      ? `${styles.navButton} ${styles.navButtonActive}`
      : styles.navButton;
  };

  const navItems: Array<{ id: AdminTab; label: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'team', label: 'Team Members' },
    { id: 'boards', label: 'Boards' },
    { id: 'projects', label: 'Projects' },
    { id: 'activity', label: 'Activity' },
    { id: 'system', label: 'System' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div
      className={isPanel ? styles.panelWrapper : styles.overlay}
      onClick={isPanel ? undefined : handleOverlayClick}
    >
      <section className={isPanel ? styles.panel : styles.modal}>
        <header className={styles.header}>
          <div className={styles.headerIdentity}>
            <div className={styles.headerIcon}>
              <DashboardIcon size={18} />
            </div>
            <div>
              <h1 className={styles.headerTitle}>Admin Dashboard</h1>
              <p className={styles.headerSubtitle}>Brianna Dawes Studios</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            {isPanel && onOpenModal && (
              <button
                className={styles.modalButton}
                type="button"
                onClick={() => onOpenModal(activeTab)}
              >
                <ExternalLinkIcon size={16} />
                <span>Open Modal</span>
              </button>
            )}
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close dashboard"
              type="button"
            >
              <CloseIcon size={18} />
            </button>
          </div>
        </header>

        <nav className={styles.navTabs}>
          {navItems.map((item) => (
            <button
              key={item.id}
              className={getNavButtonClass(item.id)}
              onClick={() => setActiveTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className={styles.content}>
          {renderContent()}
        </main>

        <footer className={styles.footer}>
          <button className={styles.primaryAction} type="button">
            <span className={styles.syncIcon}>
              <SyncIcon size={16} />
            </span>
            Sync All Boards
          </button>
          <div className={styles.footerActions}>
            <button className={styles.secondaryAction} type="button">
              <DownloadIcon size={16} />
              Export Data
            </button>
            <button className={styles.secondaryAction} type="button">
              <MessageIcon size={16} />
              Announce
            </button>
            {onOpenStatus && (
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={onOpenStatus}
              >
                <BoardIcon size={16} />
                Status
              </button>
            )}
            {onOpenReport && (
              <button
                className={styles.secondaryAction}
                type="button"
                onClick={onOpenReport}
              >
                <ChartIcon size={16} />
                Report
              </button>
            )}
          </div>
          <div className={styles.lastSyncInfo}>
            <span>Last sync: 2 min ago</span>
            <span className={styles.lastSyncDivider} />
            <span className={styles.syncStatus}>
              <span className={styles.syncDot} />
              Healthy
            </span>
          </div>
        </footer>
      </section>
    </div>
  );
}
