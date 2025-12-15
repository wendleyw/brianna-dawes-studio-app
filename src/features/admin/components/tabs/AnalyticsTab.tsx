import { useState } from 'react';
import styles from './AnalyticsTab.module.css';

type AnalyticsSubTab = 'overview' | 'projects' | 'users' | 'settings';

export default function AnalyticsTab() {
  const [activeSubTab, setActiveSubTab] = useState<AnalyticsSubTab>('overview');

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'overview':
        return <OverviewSection />;
      case 'projects':
        return <ProjectsSection />;
      case 'users':
        return <UsersSection />;
      case 'settings':
        return <SettingsSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.subNav}>
        <button
          className={activeSubTab === 'overview' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('overview')}
        >
          Overview
        </button>
        <button
          className={activeSubTab === 'projects' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('projects')}
        >
          Projects
        </button>
        <button
          className={activeSubTab === 'users' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('users')}
        >
          Users
        </button>
        <button
          className={activeSubTab === 'settings' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('settings')}
        >
          Settings
        </button>
      </nav>

      <div className={styles.content}>
        {renderSubTabContent()}
      </div>
    </div>
  );
}

function OverviewSection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Analytics Overview</h3>
        <select className={styles.dateRangeSelect}>
          <option>Last 7 days</option>
          <option>Last 30 days</option>
          <option>Last 90 days</option>
          <option>This year</option>
        </select>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h4 className={styles.chartTitle}>Projects by Status</h4>
          <div className={styles.chartPlaceholder}>
            <div className={styles.pieChart}>
              <div className={styles.pieSegment} style={{ background: '#10B981' }}>
                Done: 12
              </div>
              <div className={styles.pieSegment} style={{ background: '#2563EB' }}>
                In Progress: 8
              </div>
              <div className={styles.pieSegment} style={{ background: '#F59E0B' }}>
                Review: 4
              </div>
              <div className={styles.pieSegment} style={{ background: '#6B7280' }}>
                Draft: 3
              </div>
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h4 className={styles.chartTitle}>Deliverables Completion Rate</h4>
          <div className={styles.chartPlaceholder}>
            <div className={styles.lineChart}>
              📈 Trending upward - 87% completion rate this week
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h4 className={styles.chartTitle}>User Activity Heatmap</h4>
          <div className={styles.chartPlaceholder}>
            <div className={styles.heatmap}>
              <div className={styles.heatmapRow}>
                <span>Mon</span>
                <div className={styles.heatmapCells}>
                  <div className={styles.heatmapCell} data-level="high"></div>
                  <div className={styles.heatmapCell} data-level="medium"></div>
                  <div className={styles.heatmapCell} data-level="high"></div>
                </div>
              </div>
              <div className={styles.heatmapRow}>
                <span>Tue</span>
                <div className={styles.heatmapCells}>
                  <div className={styles.heatmapCell} data-level="medium"></div>
                  <div className={styles.heatmapCell} data-level="low"></div>
                  <div className={styles.heatmapCell} data-level="medium"></div>
                </div>
              </div>
              <div className={styles.heatmapRow}>
                <span>Wed</span>
                <div className={styles.heatmapCells}>
                  <div className={styles.heatmapCell} data-level="high"></div>
                  <div className={styles.heatmapCell} data-level="high"></div>
                  <div className={styles.heatmapCell} data-level="medium"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <h4 className={styles.chartTitle}>Miro Sync Health</h4>
          <div className={styles.chartPlaceholder}>
            <div className={styles.syncHealth}>
              <div className={styles.syncHealthBar}>
                <div className={styles.syncHealthFill} style={{ width: '95%' }}></div>
              </div>
              <div className={styles.syncHealthLabel}>95% Uptime - Healthy</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsSection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Project Analytics</h3>
      </div>
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>📊</span>
        <p>Project-specific analytics coming soon</p>
        <p className={styles.emptySubtext}>Track completion rates, timelines, and bottlenecks</p>
      </div>
    </div>
  );
}

function UsersSection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>User Analytics</h3>
      </div>
      <div className={styles.emptyState}>
        <span className={styles.emptyIcon}>👥</span>
        <p>User activity analytics coming soon</p>
        <p className={styles.emptySubtext}>Monitor engagement, login frequency, and collaboration patterns</p>
      </div>
    </div>
  );
}

function SettingsSection() {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Admin Settings</h3>
      </div>

      <div className={styles.settingsGroup}>
        <h4 className={styles.settingsGroupTitle}>⚙️ System Configuration</h4>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Miro Board Template ID
              <span className={styles.settingDescription}>Default template for new projects</span>
            </div>
            <input
              type="text"
              className={styles.settingInput}
              placeholder="Enter template ID"
              defaultValue="o9J_k1234567890"
            />
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Auto-sync Interval
              <span className={styles.settingDescription}>How often to sync with Miro boards</span>
            </div>
            <select className={styles.settingSelect}>
              <option>Every 5 minutes</option>
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Notification Preferences
              <span className={styles.settingDescription}>Who receives system notifications</span>
            </div>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                Notify admins on sync failures
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" defaultChecked />
                Notify admins on new user signups
              </label>
              <label className={styles.checkbox}>
                <input type="checkbox" />
                Notify all on project status changes
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.settingsGroup}>
        <h4 className={styles.settingsGroupTitle}>🔐 Security</h4>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Session Timeout
              <span className={styles.settingDescription}>Automatic logout after inactivity</span>
            </div>
            <select className={styles.settingSelect}>
              <option>30 minutes</option>
              <option>1 hour</option>
              <option>4 hours</option>
              <option>8 hours</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Two-Factor Authentication
              <span className={styles.settingDescription}>Require 2FA for all users</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleLabel}>Require 2FA</span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.settingsGroup}>
        <h4 className={styles.settingsGroupTitle}>📧 Email Templates (Postmark)</h4>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Project Created
              <span className={styles.settingDescription}>Sent when a new project is created</span>
            </div>
            <button className={styles.settingButton}>Edit Template</button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Deliverable Ready for Review
              <span className={styles.settingDescription}>Sent when deliverable status changes</span>
            </div>
            <button className={styles.settingButton}>Edit Template</button>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              User Invitation
              <span className={styles.settingDescription}>Sent to new users</span>
            </div>
            <button className={styles.settingButton}>Edit Template</button>
          </div>
        </div>
      </div>

      <div className={styles.settingsActions}>
        <button className={styles.saveButton}>💾 Save Changes</button>
        <button className={styles.cancelButton}>Cancel</button>
      </div>
    </div>
  );
}
