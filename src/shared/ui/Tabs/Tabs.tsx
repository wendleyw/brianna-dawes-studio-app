import { useState, useCallback, useRef, useMemo } from 'react';
import type { TabsProps } from './Tabs.types';
import { TabsContext } from './TabsContext';
import styles from './Tabs.module.css';

export const Tabs = ({
  defaultValue,
  value: controlledValue,
  onValueChange,
  orientation = 'horizontal',
  variant = 'line',
  children,
  className,
}: TabsProps) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const tabRefsMap = useRef(new Map<string, HTMLButtonElement>());
  const registeredTabs = useRef(new Set<string>());

  const isControlled = controlledValue !== undefined;
  const activeTab = isControlled ? controlledValue : uncontrolledValue;

  const setActiveTab = useCallback(
    (value: string) => {
      if (!isControlled) {
        setUncontrolledValue(value);
      }
      onValueChange?.(value);
    },
    [isControlled, onValueChange]
  );

  const registerTab = useCallback((value: string) => {
    registeredTabs.current.add(value);
  }, []);

  const unregisterTab = useCallback((value: string) => {
    registeredTabs.current.delete(value);
    tabRefsMap.current.delete(value);
  }, []);

  const contextValue = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      orientation,
      variant,
      registerTab,
      unregisterTab,
      tabRefs: tabRefsMap.current,
    }),
    [activeTab, setActiveTab, orientation, variant, registerTab, unregisterTab]
  );

  const classNames = [
    styles.tabs,
    styles[orientation],
    styles[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={classNames}>{children}</div>
    </TabsContext.Provider>
  );
};

Tabs.displayName = 'Tabs';
