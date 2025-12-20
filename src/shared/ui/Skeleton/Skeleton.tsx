import { forwardRef, CSSProperties } from 'react';
import type { SkeletonProps } from './Skeleton.types';
import styles from './Skeleton.module.css';

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      animation = 'wave',
      count = 1,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const classNames = [
      styles.skeleton,
      styles[variant],
      styles[`animation-${animation}`],
      className,
    ].filter(Boolean).join(' ');

    const computedStyle: CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    // Card variant renders a structured skeleton
    if (variant === 'card') {
      return (
        <div ref={ref} className={styles.card} {...props}>
          <div className={styles.cardHeader}>
            <div className={`${styles.skeleton} ${styles.circular} ${styles[`animation-${animation}`]}`} style={{ width: 48, height: 48 }} />
            <div className={styles.cardHeaderText}>
              <div className={`${styles.skeleton} ${styles.text} ${styles[`animation-${animation}`]}`} style={{ width: '60%', height: 16 }} />
              <div className={`${styles.skeleton} ${styles.text} ${styles[`animation-${animation}`]}`} style={{ width: '40%', height: 14, marginTop: 8 }} />
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={`${styles.skeleton} ${styles.text} ${styles[`animation-${animation}`]}`} style={{ width: '100%', height: 14 }} />
            <div className={`${styles.skeleton} ${styles.text} ${styles[`animation-${animation}`]}`} style={{ width: '90%', height: 14, marginTop: 8 }} />
            <div className={`${styles.skeleton} ${styles.text} ${styles[`animation-${animation}`]}`} style={{ width: '75%', height: 14, marginTop: 8 }} />
          </div>
          <div className={styles.cardFooter}>
            <div className={`${styles.skeleton} ${styles.rectangular} ${styles[`animation-${animation}`]}`} style={{ width: 80, height: 32, borderRadius: 8 }} />
            <div className={`${styles.skeleton} ${styles.rectangular} ${styles[`animation-${animation}`]}`} style={{ width: 80, height: 32, borderRadius: 8 }} />
          </div>
        </div>
      );
    }

    // Render multiple skeletons if count > 1
    if (count > 1) {
      return (
        <div ref={ref} className={styles.skeletonGroup} {...props}>
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className={classNames} style={computedStyle} />
          ))}
        </div>
      );
    }

    // Single skeleton
    return <div ref={ref} className={classNames} style={computedStyle} {...props} />;
  }
);

Skeleton.displayName = 'Skeleton';
