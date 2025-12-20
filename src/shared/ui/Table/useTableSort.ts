import { useState, useMemo } from 'react';
import type { SortDirection } from './Table.types';

export function useTableSort<T>(data: T[], initialColumn?: string) {
  const [sortColumn, setSortColumn] = useState<string | null>(initialColumn || null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortColumn as keyof T];
      const bValue = b[sortColumn as keyof T];

      if (aValue === bValue) return 0;

      const comparison = aValue < bValue ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return {
    sortedData,
    sortColumn,
    sortDirection,
    handleSort,
  };
}
