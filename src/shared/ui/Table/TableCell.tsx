import type { ReactNode } from 'react';
import styles from './Table.module.css';

interface TableCellProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | undefined;
  width?: string | undefined;
  className?: string | undefined;
}

export function TableCell({
  children,
  align = 'left',
  width,
  className = ''
}: TableCellProps) {
  const alignClass = styles[`align${align.charAt(0).toUpperCase()}${align.slice(1)}`];

  return (
    <td
      className={`${alignClass} ${className}`}
      style={width ? { width } : undefined}
      role="cell"
    >
      {children}
    </td>
  );
}

TableCell.displayName = 'TableCell';
