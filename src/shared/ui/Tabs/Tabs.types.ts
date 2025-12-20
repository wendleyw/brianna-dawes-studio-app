import { ReactNode } from 'react';

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsVariant = 'line' | 'enclosed' | 'soft-rounded';

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: TabsOrientation;
  variant?: TabsVariant;
  children: ReactNode;
  className?: string;
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export interface TabProps {
  value: string;
  icon?: ReactNode;
  badge?: number | string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

export interface TabPanelProps {
  value: string;
  children: ReactNode;
  lazy?: boolean;
  className?: string;
}

export interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  orientation: TabsOrientation;
  variant: TabsVariant;
  registerTab: (value: string) => void;
  unregisterTab: (value: string) => void;
  tabRefs: Map<string, HTMLButtonElement>;
}
