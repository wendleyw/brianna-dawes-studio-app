import { useState } from 'react';
import type { SystemSubTab } from '../../domain/types';
import { MasterBoardSettings } from '../MasterBoardSettings';
import { SyncHealthDashboard } from '../SyncHealthDashboard';
import { DeveloperTools } from '../DeveloperTools';
import styles from './SystemTab.module.css';

export default function SystemTab() {
  const [activeSubTab, setActiveSubTab] = useState<SystemSubTab>('master');

  const renderSubTabContent = () => {
    switch (activeSubTab) {
      case 'master':
        return <MasterBoardSettings />;
      case 'sync':
        return <SyncHealthDashboard />;
      case 'developer':
        return <DeveloperTools />;
      default:
        return <MasterBoardSettings />;
    }
  };

  return (
    <div className={styles.container}>
      <nav className={styles.subNav}>
        <button
          className={activeSubTab === 'master' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('master')}
        >
          🖥️ Master Board
        </button>
        <button
          className={activeSubTab === 'sync' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('sync')}
        >
          🔄 Sync Health
        </button>
        <button
          className={activeSubTab === 'developer' ? styles.subNavButtonActive : styles.subNavButton}
          onClick={() => setActiveSubTab('developer')}
        >
          💻 Developer Tools
        </button>
      </nav>

      <div className={styles.content}>
        {renderSubTabContent()}
      </div>
    </div>
  );
}
