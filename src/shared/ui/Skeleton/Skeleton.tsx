import { forwardRef, CSSProperties } from 'react';
import type { SkeletonProps } from './Skeleton.types';
import styles from './Skeleton.module.css';

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ variant = 'text', width, height, className, style, ...props }, ref) => {
    const classNames = [styles.skeleton, styles[variant], className].filter(Boolean).join(' ');

    const computedStyle: CSSProperties = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    return <div ref={ref} className={classNames} style={computedStyle} {...props} />;
  }
);

Skeleton.displayName = 'Skeleton';
