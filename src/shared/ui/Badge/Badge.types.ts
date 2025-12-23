import { ReactNode, HTMLAttributes } from 'react';

export type BadgeColor = 'primary' | 'success' | 'warning' | 'error' | 'info' | 'review' | 'neutral';
export type BadgeVariant = 'solid' | 'outlined' | 'soft';
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  color?: BadgeColor;
  size?: BadgeSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  dot?: boolean;
  interactive?: boolean;
}
