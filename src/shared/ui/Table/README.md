# Table Component

A comprehensive, accessible Table component with sorting, selection, and responsive behavior.

## Features

- **Sortable Columns**: Click column headers to sort data (client-side or server-side)
- **Row Selection**: Multi-select rows with checkboxes
- **Clickable Rows**: Handle row clicks for navigation or actions
- **Custom Cell Rendering**: Use accessor functions for custom cell content
- **Empty States**: Configurable empty state UI
- **Loading States**: Built-in loading indicator
- **Sticky Headers**: Keep headers visible while scrolling
- **Responsive**: Adapts to different screen sizes
- **Accessible**: Full ARIA compliance and keyboard navigation
- **TypeScript**: Fully typed with generics

## Installation

The Table component is part of the shared UI library:

```typescript
import { Table, useTableSort } from '@shared/ui';
import type { Column } from '@shared/ui';
```

## Basic Usage

```typescript
import { Table } from '@shared/ui';
import type { Column } from '@shared/ui';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

function UserTable() {
  const data: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Designer' },
  ];

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email' },
    { id: 'role', header: 'Role', accessor: 'role' },
  ];

  return <Table data={data} columns={columns} />;
}
```

## API Reference

### Table Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | Required | Array of data objects to display |
| `columns` | `Column<T>[]` | Required | Column configuration array |
| `loading` | `boolean` | `false` | Show loading state |
| `selectable` | `boolean` | `false` | Enable row selection with checkboxes |
| `selectedRows` | `Set<string>` | `new Set()` | Set of selected row keys |
| `onSelectionChange` | `(selected: Set<string>) => void` | - | Callback when selection changes |
| `sortable` | `boolean` | `false` | Enable column sorting |
| `onSort` | `(columnId: string, direction: 'asc' \| 'desc') => void` | - | Callback when sort changes |
| `emptyState` | `ReactNode` | - | Custom empty state component |
| `stickyHeader` | `boolean` | `false` | Make header sticky while scrolling |
| `rowKey` | `keyof T \| ((row: T) => string)` | `'id'` | Function or property name to generate unique row keys |
| `onRowClick` | `(row: T) => void` | - | Callback when a row is clicked |

### Column Type

```typescript
interface Column<T> {
  id: string;                                    // Unique column identifier
  header: string | ReactNode;                    // Column header text or component
  accessor: keyof T | ((row: T) => ReactNode);   // Property name or function to get cell value
  sortable?: boolean;                            // Enable sorting for this column
  width?: string;                                // CSS width value (e.g., '100px', '20%')
  align?: 'left' | 'center' | 'right';          // Cell content alignment
}
```

## Examples

### Sortable Table

```typescript
import { Table } from '@shared/ui';

function SortableTable() {
  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    console.log(`Sorting ${columnId} ${direction}`);
    // Implement server-side or client-side sorting
  };

  return (
    <Table
      data={data}
      columns={columns}
      sortable
      onSort={handleSort}
    />
  );
}
```

### Client-Side Sorting with useTableSort Hook

```typescript
import { Table, useTableSort } from '@shared/ui';

function ClientSortTable() {
  const { sortedData, handleSort } = useTableSort(data);

  return (
    <Table
      data={sortedData}
      columns={columns}
      sortable
      onSort={(columnId) => handleSort(columnId)}
    />
  );
}
```

### Selectable Rows

```typescript
import { useState } from 'react';
import { Table } from '@shared/ui';

function SelectableTable() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  return (
    <div>
      <p>Selected: {selectedRows.size} rows</p>
      <Table
        data={data}
        columns={columns}
        selectable
        selectedRows={selectedRows}
        onSelectionChange={setSelectedRows}
      />
    </div>
  );
}
```

### Clickable Rows

```typescript
import { Table } from '@shared/ui';

function ClickableTable() {
  const handleRowClick = (user: User) => {
    console.log('Clicked:', user);
    // Navigate or open modal
  };

  return (
    <Table
      data={data}
      columns={columns}
      onRowClick={handleRowClick}
    />
  );
}
```

### Custom Cell Rendering

```typescript
import { Table } from '@shared/ui';
import { Badge, Button } from '@shared/ui';

function CustomCellTable() {
  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'solid' : 'soft'}>
          {row.status}
        </Badge>
      ),
      align: 'center',
    },
    {
      id: 'actions',
      header: 'Actions',
      accessor: (row) => (
        <Button size="sm" onClick={() => handleEdit(row)}>
          Edit
        </Button>
      ),
      align: 'right',
      width: '100px',
    },
  ];

  return <Table data={data} columns={columns} />;
}
```

### Empty State

```typescript
import { Table, EmptyState } from '@shared/ui';

function EmptyTable() {
  return (
    <Table
      data={[]}
      columns={columns}
      emptyState={
        <EmptyState
          title="No users found"
          description="Get started by adding your first user"
          variant="default"
        />
      }
    />
  );
}
```

### Sticky Header

```typescript
import { Table } from '@shared/ui';

function StickyHeaderTable() {
  return (
    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
      <Table
        data={longDataList}
        columns={columns}
        stickyHeader
        sortable
      />
    </div>
  );
}
```

### Full-Featured Example

```typescript
import { useState } from 'react';
import { Table, useTableSort, Badge } from '@shared/ui';

function FullFeaturedTable() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const { sortedData, handleSort } = useTableSort(data);

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessor: (row) => <Badge variant="solid">{row.role}</Badge>,
      sortable: true,
    },
    {
      id: 'projects',
      header: 'Projects',
      accessor: 'projects',
      sortable: true,
      align: 'right',
      width: '100px',
    },
  ];

  const handleRowClick = (user: User) => {
    console.log('Clicked:', user);
  };

  return (
    <Table
      data={sortedData}
      columns={columns}
      selectable
      selectedRows={selectedRows}
      onSelectionChange={setSelectedRows}
      sortable
      onSort={(columnId) => handleSort(columnId)}
      onRowClick={handleRowClick}
      stickyHeader
    />
  );
}
```

## useTableSort Hook

A utility hook for client-side sorting.

### API

```typescript
function useTableSort<T>(
  data: T[],
  initialColumn?: string
): {
  sortedData: T[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  handleSort: (column: string) => void;
}
```

### Usage

```typescript
const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(data, 'name');
```

## Accessibility

The Table component follows WAI-ARIA best practices:

- Proper ARIA roles (`table`, `row`, `columnheader`, `cell`)
- ARIA attributes for sorting state (`aria-sort`)
- ARIA labels for selection checkboxes
- Keyboard navigation support:
  - `Tab` to navigate between interactive elements
  - `Enter` or `Space` to activate sortable headers
  - `Enter` or `Space` to click rows (when `onRowClick` is provided)
- Screen reader announcements for state changes

## Styling

The Table component uses CSS Modules and design tokens:

- Responsive breakpoints adjust padding and font size
- Hover states for rows and sortable headers
- Visual feedback for selected rows
- Smooth transitions for interactive elements

### CSS Variables Used

- `--color-border`
- `--color-bg`, `--color-bg-subtle`, `--color-bg-hover`, `--color-bg-active`
- `--color-text-secondary`
- `--text-sm`, `--text-xs`
- `--space-2`, `--space-3`, `--space-4`
- `--radius-2`

## TypeScript

The Table component is fully typed with generics:

```typescript
// T is inferred from your data
<Table<User> data={users} columns={columns} />

// Or let TypeScript infer it
<Table data={users} columns={columns} />
```

## Performance Considerations

1. **Memoization**: Consider memoizing columns array to prevent unnecessary re-renders
2. **Virtual Scrolling**: For very large datasets (>1000 rows), consider implementing virtual scrolling
3. **Server-Side Sorting**: For large datasets, implement server-side sorting using the `onSort` callback
4. **Server-Side Pagination**: Combine with pagination for optimal performance with large datasets

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported (uses modern CSS features)

## Related Components

- `EmptyState` - For empty table states
- `Skeleton` - For loading states (used internally)
- `Badge` - For status indicators in cells
- `Button` - For action buttons in cells

## Files

- `Table.tsx` - Main table component
- `TableHeader.tsx` - Header row component
- `TableBody.tsx` - Body rows component
- `TableRow.tsx` - Individual row component
- `TableCell.tsx` - Individual cell component
- `Table.types.ts` - TypeScript type definitions
- `Table.module.css` - Component styles
- `useTableSort.ts` - Client-side sorting hook
- `index.ts` - Public exports
- `Table.example.tsx` - Usage examples
- `README.md` - This documentation
