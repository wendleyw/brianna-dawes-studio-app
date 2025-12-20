import type { Column, SortDirection } from './Table.types';
import styles from './Table.module.css';

interface TableHeaderProps<T> {
  columns: Column<T>[];
  selectable?: boolean | undefined;
  sortColumn: string | null;
  sortDirection: SortDirection;
  onSort: (columnId: string) => void;
  onSelectAll?: (() => void) | undefined;
  isAllSelected?: boolean | undefined;
  isSomeSelected?: boolean | undefined;
}

export function TableHeader<T>({
  columns,
  selectable,
  sortColumn,
  sortDirection,
  onSort,
  onSelectAll,
  isAllSelected,
  isSomeSelected,
}: TableHeaderProps<T>) {
  const renderSortIcon = (columnId: string) => {
    const isActive = sortColumn === columnId;
    const isAsc = isActive && sortDirection === 'asc';
    const isDesc = isActive && sortDirection === 'desc';

    return (
      <span className={`${styles.sortIcon} ${isActive ? styles.active : ''}`}>
        <span
          className={`${styles.sortArrow} ${styles.sortArrowUp}`}
          style={{ opacity: isAsc ? 1 : isActive ? 0.3 : undefined }}
        />
        <span
          className={`${styles.sortArrow} ${styles.sortArrowDown}`}
          style={{ opacity: isDesc ? 1 : isActive ? 0.3 : undefined }}
        />
      </span>
    );
  };

  return (
    <thead>
      <tr role="row">
        {selectable && (
          <th
            className={styles.checkboxCell}
            role="columnheader"
            aria-label="Select all rows"
          >
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={isAllSelected}
              ref={(input) => {
                if (input) {
                  input.indeterminate = isSomeSelected || false;
                }
              }}
              onChange={onSelectAll}
              aria-label="Select all rows"
            />
          </th>
        )}
        {columns.map((column) => {
          const isSortable = column.sortable !== false;
          const alignClass = column.align
            ? styles[`align${column.align.charAt(0).toUpperCase()}${column.align.slice(1)}`]
            : styles.alignLeft;

          return (
            <th
              key={column.id}
              className={`${isSortable ? styles.sortable : ''} ${alignClass}`}
              style={column.width ? { width: column.width } : undefined}
              onClick={isSortable ? () => onSort(column.id) : undefined}
              role="columnheader"
              aria-sort={
                sortColumn === column.id
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : sortDirection === 'desc'
                    ? 'descending'
                    : 'none'
                  : undefined
              }
              tabIndex={isSortable ? 0 : undefined}
              onKeyDown={
                isSortable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSort(column.id);
                      }
                    }
                  : undefined
              }
            >
              {isSortable ? (
                <div className={styles.sortHeader}>
                  <span>{column.header}</span>
                  {renderSortIcon(column.id)}
                </div>
              ) : (
                column.header
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}

TableHeader.displayName = 'TableHeader';
