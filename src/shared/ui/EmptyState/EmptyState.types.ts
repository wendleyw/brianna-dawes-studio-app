import { ReactNode } from 'react';

export type EmptyStateVariant = 'default' | 'compact' | 'illustration';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
}

export interface EmptyStateSecondaryAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: ReactNode;
  illustration?: string;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateSecondaryAction;
  variant?: EmptyStateVariant;
  className?: string;
}
