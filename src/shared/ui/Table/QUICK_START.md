# Table Component - Quick Start Guide

## Import

```typescript
import { Table, useTableSort } from '@shared/ui';
import type { Column } from '@shared/ui';
```

## Minimal Example

```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const data: User[] = [
  { id: '1', name: 'John', email: 'john@example.com' },
];

const columns: Column<User>[] = [
  { id: 'name', header: 'Name', accessor: 'name' },
  { id: 'email', header: 'Email', accessor: 'email' },
];

<Table data={data} columns={columns} />
```

## Common Patterns

### Pattern 1: Sortable Table

```typescript
<Table data={data} columns={columns} sortable />
```

### Pattern 2: Selectable Rows

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());

<Table
  data={data}
  columns={columns}
  selectable
  selectedRows={selected}
  onSelectionChange={setSelected}
/>
```

### Pattern 3: Clickable Rows

```typescript
<Table
  data={data}
  columns={columns}
  onRowClick={(row) => console.log(row)}
/>
```

### Pattern 4: Custom Cell Content

```typescript
const columns: Column<User>[] = [
  {
    id: 'status',
    header: 'Status',
    accessor: (row) => <Badge variant="solid">{row.status}</Badge>,
  },
];
```

### Pattern 5: Client-Side Sorting

```typescript
const { sortedData, handleSort } = useTableSort(data);

<Table
  data={sortedData}
  columns={columns}
  sortable
  onSort={(col) => handleSort(col)}
/>
```

### Pattern 6: Empty State

```typescript
<Table
  data={[]}
  columns={columns}
  emptyState={<EmptyState title="No data" />}
/>
```

### Pattern 7: Loading State

```typescript
<Table data={data} columns={columns} loading />
```

### Pattern 8: All Features Combined

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set());
const { sortedData, handleSort } = useTableSort(data);

<Table
  data={sortedData}
  columns={columns}
  selectable
  selectedRows={selected}
  onSelectionChange={setSelected}
  sortable
  onSort={(col) => handleSort(col)}
  onRowClick={(row) => navigate(`/users/${row.id}`)}
  stickyHeader
  emptyState={<EmptyState title="No users" />}
/>
```

## Column Configuration

```typescript
{
  id: 'unique-id',              // Required: unique identifier
  header: 'Display Name',       // Required: column header text
  accessor: 'propertyName',     // Required: property name or function
  sortable: true,               // Optional: enable sorting
  width: '100px',               // Optional: CSS width
  align: 'right',               // Optional: 'left' | 'center' | 'right'
}
```

## Tips

1. **Always provide unique `id` for columns**
2. **Use `accessor` function for custom rendering**
3. **Use `rowKey` if your data doesn't have an `id` field**
4. **Memoize columns array to prevent re-renders**
5. **Use `useTableSort` for client-side sorting**
6. **Use `onSort` callback for server-side sorting**

## See Also

- [Full Documentation](./README.md)
- [Examples](./Table.example.tsx)
