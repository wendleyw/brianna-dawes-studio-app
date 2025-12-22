import { useState } from 'react';
import type { TableProps, SortDirection } from './Table.types';
import { TableHeader } from './TableHeader';
import { TableBody } from './TableBody';
import styles from './Table.module.css';

export function Table<T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedRows = new Set(),
  onSelectionChange,
  sortable = false,
  onSort,
  emptyState,
  stickyHeader = false,
  rowKey = 'id',
  onRowClick,
}: TableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (columnId: string) => {
    if (!sortable) return;

    let newDirection: SortDirection = 'asc';

    if (sortColumn === columnId) {
      if (sortDirection === 'asc') {
        newDirection = 'desc';
      } else if (sortDirection === 'desc') {
        newDirection = null;
        setSortColumn(null);
      }
    }

    setSortColumn(newDirection ? columnId : null);
    setSortDirection(newDirection);

    if (newDirection && onSort) {
      onSort(columnId, newDirection);
    }
  };

  const handleSelectAll = () => {
    if (!selectable || !onSelectionChange) return;

    const allKeys = data.map((row) =>
      typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey])
    );

    if (selectedRows.size === data.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(allKeys));
    }
  };

  const handleRowSelect = (key: string) => {
    if (!selectable || !onSelectionChange) return;

    const newSelection = new Set(selectedRows);
    if (newSelection.has(key)) {
      newSelection.delete(key);
    } else {
      newSelection.add(key);
    }
    onSelectionChange(newSelection);
  };

  const isAllSelected = selectable && data.length > 0 && selectedRows.size === data.length;
  const isSomeSelected = selectable && selectedRows.size > 0 && selectedRows.size < data.length;

  if (loading) {
    return (
      <div className={`${styles.tableContainer} ${styles.loading}`}>
        <table className={styles.table} role="table">
          <TableHeader
            columns={columns}
            selectable={selectable}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
            isAllSelected={false}
            isSomeSelected={false}
          />
          <tbody>
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                <div className={styles.emptyState}>Loading...</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    if (emptyState) {
      return (
        <div className={styles.tableContainer}>
          <div className={styles.emptyState}>{emptyState}</div>
        </div>
      );
    }
    return (
      <div className={styles.tableContainer}>
        <table className={styles.table} role="table">
          <TableHeader
            columns={columns}
            selectable={selectable}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onSelectAll={handleSelectAll}
            isAllSelected={false}
            isSomeSelected={false}
          />
          <tbody>
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                <div className={styles.emptyState}>No data available</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`${styles.tableContainer} ${stickyHeader ? styles.stickyHeader : ''}`}>
      <table className={styles.table} role="table" aria-label="Data table">
        <TableHeader
          columns={columns}
          selectable={selectable}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onSelectAll={handleSelectAll}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
        />
        <TableBody
          data={data}
          columns={columns}
          selectable={selectable}
          selectedRows={selectedRows}
          onRowSelect={handleRowSelect}
          onRowClick={onRowClick || undefined}
          rowKey={rowKey}
        />
      </table>
    </div>
  );
}

Table.displayName = 'Table';
