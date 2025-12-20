import type { TabListProps } from './Tabs.types';
import { useTabsContext } from './TabsContext';
import styles from './Tabs.module.css';

export const TabList = ({ children, className }: TabListProps) => {
  const { orientation } = useTabsContext();

  const classNames = [
    styles.tabList,
    styles[`tabList-${orientation}`],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames} role="tablist" aria-orientation={orientation}>
      {children}
    </div>
  );
};

TabList.displayName = 'TabList';
