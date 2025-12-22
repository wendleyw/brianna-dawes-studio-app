import { useState } from 'react';
import styles from './SettingsTab.module.css';

type SettingsSubTab = 'general' | 'integrations' | 'notifications';

export default function SettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>('general');

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'general':
        return <GeneralSettings />;
      case 'integrations':
        return <IntegrationsSettings />;
      case 'notifications':
        return <NotificationsSettings />;
      default:
        return <GeneralSettings />;
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.subNav}>
        <button
          className={activeSubTab === 'general' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('general')}
        >
          General
        </button>
        <button
          className={activeSubTab === 'integrations' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('integrations')}
        >
          Integrations
        </button>
        <button
          className={activeSubTab === 'notifications' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('notifications')}
        >
          Notifications
        </button>
      </nav>

      <div className={styles.content}>
        {renderSubTabContent()}
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className={styles.section}>
      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Studio Information</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Studio Name
              <span className={styles.settingDescription}>The name displayed across the platform</span>
            </div>
            <input
              type="text"
              className={styles.settingInput}
              defaultValue="Brianna Dawes Studios"
            />
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Timezone
              <span className={styles.settingDescription}>Used for scheduling and timestamps</span>
            </div>
            <select className={styles.settingSelect}>
              <option>UTC-8 (Pacific Time)</option>
              <option>UTC-5 (Eastern Time)</option>
              <option>UTC-3 (Brazil Time)</option>
              <option>UTC+0 (London)</option>
              <option>UTC+1 (Paris)</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Language
              <span className={styles.settingDescription}>Default language for the interface</span>
            </div>
            <select className={styles.settingSelect}>
              <option>English</option>
              <option>Portuguese</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Date Format
              <span className={styles.settingDescription}>How dates are displayed</span>
            </div>
            <select className={styles.settingSelect}>
              <option>MM/DD/YYYY (US)</option>
              <option>DD/MM/YYYY (EU)</option>
              <option>YYYY-MM-DD (ISO)</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Default Project Settings</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Default Project Status
              <span className={styles.settingDescription}>Initial status for new projects</span>
            </div>
            <select className={styles.settingSelect}>
              <option>Draft</option>
              <option>In Progress</option>
            </select>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Auto-assign Designer
              <span className={styles.settingDescription}>Automatically assign projects to available designers</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
              <span className={styles.toggleLabel}>Enable auto-assignment</span>
            </label>
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

function IntegrationsSettings() {
  return (
    <div className={styles.section}>
      <div className={styles.integrationCard}>
        <div className={styles.integrationHeader}>
          <div className={styles.integrationInfo}>
            <div className={styles.integrationIcon}>🎨</div>
            <div>
              <div className={styles.integrationName}>Miro</div>
              <div className={styles.integrationDescription}>
                Board manipulation and real-time sync
              </div>
            </div>
          </div>
          <span className={styles.statusConnected}>✅ Connected</span>
        </div>
        <div className={styles.integrationActions}>
          <button className={styles.integrationButton}>Reconnect</button>
          <button className={styles.integrationButton}>Test Connection</button>
          <button className={styles.integrationButtonDanger}>Disconnect</button>
        </div>
        <div className={styles.integrationDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Account:</span>
            <span className={styles.detailValue}>studio@brianna.com</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Last Sync:</span>
            <span className={styles.detailValue}>2 minutes ago</span>
          </div>
        </div>
      </div>

      <div className={styles.integrationCard}>
        <div className={styles.integrationHeader}>
          <div className={styles.integrationInfo}>
            <div className={styles.integrationIcon}>📧</div>
            <div>
              <div className={styles.integrationName}>Postmark</div>
              <div className={styles.integrationDescription}>
                Transactional email service
              </div>
            </div>
          </div>
          <span className={styles.statusConnected}>✅ Connected</span>
        </div>
        <div className={styles.integrationActions}>
          <button className={styles.integrationButton}>Update API Key</button>
          <button className={styles.integrationButton}>Send Test Email</button>
          <button className={styles.integrationButtonDanger}>Disconnect</button>
        </div>
        <div className={styles.integrationDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>API Key:</span>
            <span className={styles.detailValue}>***********46</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Emails Sent:</span>
            <span className={styles.detailValue}>1,247 this month</span>
          </div>
        </div>
      </div>

      <div className={styles.integrationCard}>
        <div className={styles.integrationHeader}>
          <div className={styles.integrationInfo}>
            <div className={styles.integrationIcon}>🐛</div>
            <div>
              <div className={styles.integrationName}>Sentry</div>
              <div className={styles.integrationDescription}>
                Error tracking and monitoring
              </div>
            </div>
          </div>
          <span className={styles.statusConnected}>✅ Active</span>
        </div>
        <div className={styles.integrationActions}>
          <button className={styles.integrationButton}>View Dashboard</button>
          <button className={styles.integrationButton}>Update DSN</button>
          <button className={styles.integrationButtonDanger}>Disable</button>
        </div>
        <div className={styles.integrationDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Errors Tracked:</span>
            <span className={styles.detailValue}>12 this week</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Performance:</span>
            <span className={styles.detailValue}>98.5% uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsSettings() {
  return (
    <div className={styles.section}>
      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>Email Notifications</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              New Project Created
              <span className={styles.settingDescription}>Notify when a new project is created</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              New User Signup
              <span className={styles.settingDescription}>Notify when a new user signs up</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Project Status Changed
              <span className={styles.settingDescription}>Notify when project status changes</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Sync Issues Detected
              <span className={styles.settingDescription}>Notify when Miro sync fails</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              File Uploads
              <span className={styles.settingDescription}>Notify when users upload files</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>
        </div>
      </div>

      <div className={styles.settingsGroup}>
        <h3 className={styles.groupTitle}>In-App Notifications</h3>
        <div className={styles.settingsList}>
          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Desktop Notifications
              <span className={styles.settingDescription}>Show browser notifications</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" defaultChecked />
              <span className={styles.toggleSlider}></span>
            </label>
          </div>

          <div className={styles.settingItem}>
            <div className={styles.settingLabel}>
              Sound Effects
              <span className={styles.settingDescription}>Play sound for notifications</span>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" />
              <span className={styles.toggleSlider}></span>
            </label>
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
