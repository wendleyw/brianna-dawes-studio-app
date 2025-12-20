import { ReactNode } from 'react';

export interface Column<T> {
  id: string;
  header: string | ReactNode;
  accessor: keyof T | ((row: T) => ReactNode);
  sortable?: boolean | undefined;
  width?: string | undefined;
  align?: 'left' | 'center' | 'right' | undefined;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean | undefined;
  selectable?: boolean | undefined;
  selectedRows?: Set<string> | undefined;
  onSelectionChange?: ((selected: Set<string>) => void) | undefined;
  sortable?: boolean | undefined;
  onSort?: ((columnId: string, direction: 'asc' | 'desc') => void) | undefined;
  emptyState?: ReactNode | undefined;
  stickyHeader?: boolean | undefined;
  rowKey?: keyof T | ((row: T) => string) | undefined;
  onRowClick?: ((row: T) => void) | undefined;
}

export type SortDirection = 'asc' | 'desc' | null;
