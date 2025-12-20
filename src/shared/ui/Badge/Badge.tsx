import { forwardRef } from 'react';
import type { BadgeProps } from './Badge.types';
import styles from './Badge.module.css';

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'solid',
      color = 'neutral',
      size = 'md',
      leftIcon,
      rightIcon,
      dot = false,
      interactive = false,
      children,
      className,
      onClick,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.badge,
      styles[`variant-${variant}`],
      styles[`color-${color}`],
      styles[`size-${size}`],
      leftIcon && styles.withLeftIcon,
      rightIcon && styles.withRightIcon,
      dot && styles.dot,
      interactive && styles.interactive,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    if (dot) {
      return <span ref={ref} className={classNames} {...props} />;
    }

    return (
      <span
        ref={ref}
        className={classNames}
        onClick={onClick}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        {...props}
      >
        {leftIcon && <span className={styles.iconLeft}>{leftIcon}</span>}
        {children}
        {rightIcon && <span className={styles.iconRight}>{rightIcon}</span>}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
