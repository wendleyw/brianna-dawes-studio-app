import { useEffect, useRef, useCallback, KeyboardEvent } from 'react';
import type { TabProps } from './Tabs.types';
import { useTabsContext } from './TabsContext';
import styles from './Tabs.module.css';

export const Tab = ({ value, icon, badge, disabled = false, children, className }: TabProps) => {
  const { activeTab, setActiveTab, variant, orientation, registerTab, unregisterTab, tabRefs } =
    useTabsContext();
  const tabRef = useRef<HTMLButtonElement>(null);

  const isActive = activeTab === value;

  useEffect(() => {
    registerTab(value);
    if (tabRef.current) {
      tabRefs.set(value, tabRef.current);
    }
    return () => {
      unregisterTab(value);
    };
  }, [value, registerTab, unregisterTab, tabRefs]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      setActiveTab(value);
    }
  }, [disabled, setActiveTab, value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const tabValues = Array.from(tabRefs.keys());
      const currentIndex = tabValues.indexOf(value);

      let nextIndex: number | null = null;

      if (orientation === 'horizontal') {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          nextIndex = currentIndex + 1;
          if (nextIndex >= tabValues.length) nextIndex = 0;
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = tabValues.length - 1;
        }
      } else {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          nextIndex = currentIndex + 1;
          if (nextIndex >= tabValues.length) nextIndex = 0;
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          nextIndex = currentIndex - 1;
          if (nextIndex < 0) nextIndex = tabValues.length - 1;
        }
      }

      if (event.key === 'Home') {
        event.preventDefault();
        nextIndex = 0;
      } else if (event.key === 'End') {
        event.preventDefault();
        nextIndex = tabValues.length - 1;
      }

      if (nextIndex !== null) {
        const nextValue = tabValues[nextIndex];
        if (nextValue !== undefined) {
          const nextTab = tabRefs.get(nextValue);
          if (nextTab && !nextTab.disabled) {
            setActiveTab(nextValue);
            nextTab.focus();
          }
        }
      }
    },
    [orientation, tabRefs, value, setActiveTab]
  );

  const classNames = [
    styles.tab,
    styles[`tab-${variant}`],
    isActive && styles.active,
    disabled && styles.disabled,
    className,
  ].filter(Boolean).join(' ');

  const panelId = `panel-${value}`;
  const tabId = `tab-${value}`;

  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={panelId}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      className={classNames}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {icon && <span className={styles.tabIcon}>{icon}</span>}
      <span className={styles.tabLabel}>{children}</span>
      {badge !== undefined && (
        <span className={styles.tabBadge}>
          {typeof badge === 'number' && badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
};

Tab.displayName = 'Tab';
