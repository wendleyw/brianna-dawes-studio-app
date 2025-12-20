import type { Column } from './Table.types';
import { TableRow } from './TableRow';
import { TableCell } from './TableCell';
import styles from './Table.module.css';

interface TableBodyProps<T> {
  data: T[];
  columns: Column<T>[];
  selectable?: boolean | undefined;
  selectedRows: Set<string>;
  onRowSelect: (key: string) => void;
  onRowClick?: ((row: T) => void) | undefined;
  rowKey: keyof T | ((row: T) => string);
}

export function TableBody<T extends Record<string, any>>({
  data,
  columns,
  selectable,
  selectedRows,
  onRowSelect,
  onRowClick,
  rowKey,
}: TableBodyProps<T>) {
  const getRowKey = (row: T): string => {
    return typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey]);
  };

  const getCellValue = (row: T, column: Column<T>) => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    return row[column.accessor];
  };

  return (
    <tbody>
      {data.map((row) => {
        const key = getRowKey(row);
        const isSelected = selectedRows.has(key);

        return (
          <TableRow
            key={key}
            row={row}
            isSelected={isSelected}
            isClickable={!!onRowClick}
            onClick={onRowClick || undefined}
          >
            {selectable && (
              <TableCell className={styles.checkboxCell || undefined}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isSelected}
                  onChange={() => onRowSelect(key)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select row ${key}`}
                />
              </TableCell>
            )}
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align || undefined}
                width={column.width || undefined}
              >
                {getCellValue(row, column)}
              </TableCell>
            ))}
          </TableRow>
        );
      })}
    </tbody>
  );
}

TableBody.displayName = 'TableBody';
