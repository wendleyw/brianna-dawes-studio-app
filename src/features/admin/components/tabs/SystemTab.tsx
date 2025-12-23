import { useState } from 'react';
import type { SystemSubTab } from '../../domain/types';
import { MasterBoardSettings } from '../MasterBoardSettings';
import { SyncHealthDashboard } from '../SyncHealthDashboard';
import { DeveloperTools } from '../DeveloperTools';
import baseStyles from './AdminTab.module.css';

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
    <div className={baseStyles.tabContainer}>
      {/* Tab Header */}
      <div className={baseStyles.tabHeader}>
        <div className={baseStyles.tabHeaderMain}>
          <h2 className={baseStyles.tabTitle}>System Settings</h2>
          <p className={baseStyles.tabSubtitle}>Configure master board, sync health, and developer tools</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          className={activeSubTab === 'master' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setActiveSubTab('master')}
        >
          Master Board
        </button>
        <button
          className={activeSubTab === 'sync' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setActiveSubTab('sync')}
        >
          Sync Health
        </button>
        <button
          className={activeSubTab === 'developer' ? `${baseStyles.filterChip} ${baseStyles.filterChipActive}` : baseStyles.filterChip}
          onClick={() => setActiveSubTab('developer')}
        >
          Developer Tools
        </button>
      </div>

      {/* Content */}
      <div>
        {renderSubTabContent()}
      </div>
    </div>
  );
}
