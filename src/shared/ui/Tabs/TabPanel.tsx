import { useEffect, useState } from 'react';
import type { TabPanelProps } from './Tabs.types';
import { useTabsContext } from './TabsContext';
import styles from './Tabs.module.css';

export const TabPanel = ({ value, children, lazy = false, className }: TabPanelProps) => {
  const { activeTab } = useTabsContext();
  const [hasBeenActive, setHasBeenActive] = useState(!lazy);

  const isActive = activeTab === value;

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true);
    }
  }, [isActive, hasBeenActive]);

  const tabId = `tab-${value}`;
  const panelId = `panel-${value}`;

  const classNames = [
    styles.tabPanel,
    !isActive && styles.hidden,
    className,
  ].filter(Boolean).join(' ');

  // Don't render content if lazy and never been active
  if (lazy && !hasBeenActive) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={panelId}
      aria-labelledby={tabId}
      hidden={!isActive}
      className={classNames}
    >
      {children}
    </div>
  );
};

TabPanel.displayName = 'TabPanel';
