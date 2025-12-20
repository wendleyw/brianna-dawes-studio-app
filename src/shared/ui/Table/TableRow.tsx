import type { ReactNode } from 'react';
import styles from './Table.module.css';

interface TableRowProps<T> {
  children: ReactNode;
  row: T;
  isSelected?: boolean | undefined;
  isClickable?: boolean | undefined;
  onClick?: ((row: T) => void) | undefined;
  className?: string | undefined;
}

export function TableRow<T>({
  children,
  row,
  isSelected = false,
  isClickable = false,
  onClick,
  className = ''
}: TableRowProps<T>) {
  const handleClick = () => {
    if (onClick) {
      onClick(row);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(row);
    }
  };

  const rowClasses = [
    isClickable ? styles.clickableRow : '',
    isSelected ? styles.selectedRow : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <tr
      className={rowClasses}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role="row"
      tabIndex={isClickable ? 0 : undefined}
      aria-selected={isSelected ? true : undefined}
    >
      {children}
    </tr>
  );
}

TableRow.displayName = 'TableRow';
