import { useState, useEffect } from 'react';
import type { AdminTab } from '../domain/types';
import OverviewTab from './tabs/OverviewTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import ProjectsTab from './tabs/ProjectsTab';
import ActivityTab from './tabs/ActivityTab';
import SystemTab from './tabs/SystemTab';
import ReportsTab from './tabs/ReportsTab';
import { TeamManagement } from './TeamManagement';
import { BoardManagement } from './BoardManagement';
import { AppSettings } from './AppSettings';
import { ProjectTypesSettings } from './ProjectTypesSettings';
import { useOverviewMetrics } from '../hooks';
import {
  CloseIcon,
  DashboardIcon,
  DownloadIcon,
  ExternalLinkIcon,
  BoardIcon,
  MessageIcon,
  SyncIcon,
  FolderIcon,
  UsersIcon,
  CheckIcon,
  AlertTriangleIcon,
  FileIcon,
} from '@shared/ui/Icons';
import { CreateReportModal } from '@features/reports/components/CreateReportModal';
import styles from './AdminDashboard.module.css';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: AdminTab;
  variant?: 'modal' | 'panel';
  onOpenModal?: (tab: AdminTab) => void;
  onOpenStatus?: () => void;
}

export default function AdminDashboard({
  isOpen,
  onClose,
  defaultTab = 'overview',
  variant = 'modal',
  onOpenModal,
  onOpenStatus,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>(defaultTab);
  const [isCreateReportOpen, setIsCreateReportOpen] = useState(false);
  const isPanel = variant === 'panel';
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();

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
      case 'reports':
        return <ReportsTab />;
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
    { id: 'projects', label: 'Projects' },
    { id: 'team', label: 'Team' },
    { id: 'boards', label: 'Boards' },
    { id: 'reports', label: 'Reports' },
    { id: 'activity', label: 'Activity' },
    { id: 'system', label: 'System' },
  ];

  // Panel (Compact) - Quick overview with essential KPIs
  if (isPanel) {
    const stats = {
      activeProjects: metrics?.activeProjects || 0,
      projectsInReview: (metrics?.overdueProjects || 0) + (metrics?.changesRequestedProjects || 0),
      syncHealth: metrics?.completionRate ?? 98,
      pendingIssues: (metrics?.overdueProjects || 0) + (metrics?.dueDateRequests || 0),
    };

    const hasIssues = stats.pendingIssues > 0 || stats.projectsInReview > 0;
    const systemStatus = hasIssues ? 'warning' : 'healthy';

    return (
      <>
        <div className={styles.panelWrapper}>
          <section className={styles.panel}>
          {/* Header */}
          <header className={styles.header}>
            <div className={styles.headerIdentity}>
              <div className={styles.headerIcon}>
                <DashboardIcon size={18} />
              </div>
              <div>
                <h1 className={styles.headerTitle}>Admin Overview</h1>
                <p className={styles.headerSubtitle}>BD Studios</p>
              </div>
            </div>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close dashboard"
              type="button"
            >
              <CloseIcon size={18} />
            </button>
          </header>

          {/* Content - No tabs, direct compact view */}
          <main className={styles.panelContent}>
            {metricsLoading ? (
              <div className={styles.panelLoading}>Loading...</div>
            ) : (
              <>
                {/* Essential KPIs - Compact Cards */}
                <section className={styles.panelKpis}>
                  <div className={`${styles.kpiCard} ${styles.kpiSand}`}>
                    <div className={styles.kpiIcon}>
                      <FolderIcon size={16} />
                    </div>
                    <div className={styles.kpiMeta}>
                      <span className={styles.kpiValue}>{stats.activeProjects}</span>
                      <span className={styles.kpiLabel}>Active Projects</span>
                    </div>
                  </div>

                  <div className={`${styles.kpiCard} ${styles.kpiClay}`}>
                    <div className={styles.kpiIcon}>
                      <AlertTriangleIcon size={16} />
                    </div>
                    <div className={styles.kpiMeta}>
                      <span className={styles.kpiValue}>{stats.projectsInReview}</span>
                      <span className={styles.kpiLabel}>In Review</span>
                    </div>
                  </div>

                  <div className={`${styles.kpiCard} ${styles.kpiHealth}`}>
                    <div className={styles.kpiIcon}>
                      <CheckIcon size={16} />
                    </div>
                    <div className={styles.kpiMeta}>
                      <span className={styles.kpiValue}>{stats.syncHealth}%</span>
                      <span className={styles.kpiLabel}>Sync Health</span>
                    </div>
                  </div>

                  <div className={`${styles.kpiCard} ${styles.kpiOlive}`}>
                    <div className={styles.kpiIcon}>
                      <UsersIcon size={16} />
                    </div>
                    <div className={styles.kpiMeta}>
                      <span className={styles.kpiValue}>{stats.pendingIssues}</span>
                      <span className={styles.kpiLabel}>Pending Issues</span>
                    </div>
                  </div>
                </section>

                {/* System Status Card */}
                <section className={styles.panelStatus}>
                  <h3 className={styles.panelSectionTitle}>System Status</h3>
                  <div
                    className={`${styles.panelSystemCard} ${
                      systemStatus === 'healthy' ? styles.systemHealthy : styles.systemWarning
                    }`}
                  >
                    <div className={styles.systemIcon}>
                      <CheckIcon size={16} />
                    </div>
                    <div>
                      <p className={styles.systemTitle}>
                        {systemStatus === 'healthy' ? 'All systems operational' : 'Needs attention'}
                      </p>
                      <p className={styles.systemMessage}>
                        {systemStatus === 'healthy'
                          ? 'Sync servers responding normally'
                          : `${stats.pendingIssues} issue${stats.pendingIssues !== 1 ? 's' : ''} require review`}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Quick Actions */}
                <section className={styles.panelActions}>
                  <h3 className={styles.panelSectionTitle}>Quick Actions</h3>
                  <div className={styles.panelActionButtons}>
                    <button
                      className={styles.panelActionSecondary}
                      type="button"
                      onClick={() => setIsCreateReportOpen(true)}
                    >
                      <FileIcon size={16} />
                      Report
                    </button>
                    <button className={styles.panelActionSecondary} type="button">
                      <SyncIcon size={16} />
                      Sync All
                    </button>
                    <button className={styles.panelActionSecondary} type="button">
                      <DownloadIcon size={16} />
                      Export
                    </button>
                    <button className={styles.panelActionSecondary} type="button">
                      <MessageIcon size={16} />
                      Announce
                    </button>
                    {onOpenStatus && (
                      <button className={styles.panelActionSecondary} type="button" onClick={onOpenStatus}>
                        <BoardIcon size={16} />
                        Status
                      </button>
                    )}
                  </div>
                </section>
              </>
            )}
          </main>

          {/* CTA to open Modal */}
            {onOpenModal && (
              <footer className={styles.panelFooter}>
                <button
                  className={styles.panelCtaButton}
                  type="button"
                  onClick={() => onOpenModal(activeTab)}
                >
                  <span>Open Full Admin</span>
                  <ExternalLinkIcon size={18} />
                </button>
              </footer>
            )}
          </section>
        </div>
        <CreateReportModal
          open={isCreateReportOpen}
          onClose={() => setIsCreateReportOpen(false)}
        />
      </>
    );
  }

  // Modal (Full) - Complete admin interface with tabs
  return (
    <>
      <div className={styles.overlay} onClick={handleOverlayClick}>
        <section className={styles.modal}>
        {/* Header with Admin Badge */}
        <header className={styles.header}>
          <div className={styles.headerIdentity}>
            <div className={styles.headerIcon}>
              <DashboardIcon size={18} />
            </div>
            <div>
              <div className={styles.headerTitleRow}>
                <h1 className={styles.headerTitle}>Admin Dashboard</h1>
                <span className={styles.adminBadge}>Admin Only</span>
              </div>
              <p className={styles.headerSubtitle}>BD Studios</p>
            </div>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close dashboard"
            type="button"
          >
            <CloseIcon size={18} />
          </button>
        </header>

        {/* Navigation Tabs */}
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

          {/* Content */}
          <main className={styles.content}>{renderContent()}</main>
        </section>
      </div>
      <CreateReportModal
        open={isCreateReportOpen}
        onClose={() => setIsCreateReportOpen(false)}
      />
    </>
  );
}
