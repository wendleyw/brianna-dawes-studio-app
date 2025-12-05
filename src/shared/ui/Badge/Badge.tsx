import { forwardRef } from 'react';
import type { BadgeProps } from './Badge.types';
import styles from './Badge.module.css';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'neutral', size = 'md', children, className, ...props }, ref) => {
    const classNames = [styles.badge, styles[variant], styles[size], className]
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classNames} {...props}>
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
