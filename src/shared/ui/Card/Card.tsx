import { forwardRef } from 'react';
import type { CardProps } from './Card.types';
import styles from './Card.module.css';

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, hoverable = false, className, ...props }, ref) => {
    const classNames = [styles.card, hoverable && styles.hoverable, className]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
