/**
 * Table Component Usage Examples
 *
 * This file demonstrates how to use the Table component with various configurations.
 */

import { useState } from 'react';
import { Table } from './Table';
import { useTableSort } from './useTableSort';
import type { Column } from './Table.types';
import { Badge } from '../Badge';
import { EmptyState } from '../EmptyState';

// Example data types
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'designer' | 'client';
  status: 'active' | 'inactive';
  projects: number;
}

// Example 1: Basic Table
export function BasicTableExample() {
  const data: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', projects: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'designer', status: 'active', projects: 3 },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'client', status: 'inactive', projects: 1 },
  ];

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessor: 'email',
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

  return <Table data={data} columns={columns} />;
}

// Example 2: Sortable Table with Custom Sorting
export function SortableTableExample() {
  const data: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', projects: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'designer', status: 'active', projects: 3 },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'client', status: 'inactive', projects: 1 },
  ];

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name', sortable: true },
    { id: 'email', header: 'Email', accessor: 'email', sortable: true },
    { id: 'projects', header: 'Projects', accessor: 'projects', sortable: true, align: 'right' },
  ];

  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    console.log(`Sorting by ${columnId} in ${direction} order`);
    // Handle server-side sorting here
  };

  return <Table data={data} columns={columns} sortable onSort={handleSort} />;
}

// Example 3: Selectable Table
export function SelectableTableExample() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const data: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', projects: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'designer', status: 'active', projects: 3 },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'client', status: 'inactive', projects: 1 },
  ];

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email' },
    { id: 'role', header: 'Role', accessor: 'role' },
  ];

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

// Example 4: Table with Row Click
export function ClickableTableExample() {
  const data: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', projects: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'designer', status: 'active', projects: 3 },
  ];

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email' },
  ];

  const handleRowClick = (user: User) => {
    console.log('Clicked user:', user);
    // Navigate to user detail page or open modal
  };

  return <Table data={data} columns={columns} onRowClick={handleRowClick} />;
}

// Example 5: Table with Empty State
export function EmptyTableExample() {
  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email' },
  ];

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

// Example 6: Loading State
export function LoadingTableExample() {
  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name' },
    { id: 'email', header: 'Email', accessor: 'email' },
  ];

  return <Table data={[]} columns={columns} loading />;
}

// Example 7: Using useTableSort Hook for Client-Side Sorting
export function ClientSortTableExample() {
  const data: User[] = [
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', projects: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'designer', status: 'active', projects: 3 },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'client', status: 'inactive', projects: 1 },
  ];

  const { sortedData, sortColumn, sortDirection, handleSort } = useTableSort(data, 'name');

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name', sortable: true },
    { id: 'email', header: 'Email', accessor: 'email', sortable: true },
    { id: 'projects', header: 'Projects', accessor: 'projects', sortable: true, align: 'right' },
  ];

  return (
    <div>
      <p>
        Sorted by: {sortColumn || 'none'} ({sortDirection})
      </p>
      <Table
        data={sortedData}
        columns={columns}
        sortable
        onSort={(columnId) => handleSort(columnId)}
      />
    </div>
  );
}

// Example 8: Sticky Header Table
export function StickyHeaderTableExample() {
  const data: User[] = Array.from({ length: 50 }, (_, i) => ({
    id: String(i + 1),
    name: `User ${i + 1}`,
    email: `user${i + 1}@example.com`,
    role: ['admin', 'designer', 'client'][i % 3] as 'admin' | 'designer' | 'client',
    status: i % 2 === 0 ? 'active' : 'inactive' as 'active' | 'inactive',
    projects: Math.floor(Math.random() * 10),
  }));

  const columns: Column<User>[] = [
    { id: 'name', header: 'Name', accessor: 'name', sortable: true },
    { id: 'email', header: 'Email', accessor: 'email', sortable: true },
    { id: 'role', header: 'Role', accessor: 'role', sortable: true },
    { id: 'projects', header: 'Projects', accessor: 'projects', sortable: true, align: 'right' },
  ];

  return (
    <div style={{ maxHeight: '400px', overflow: 'auto' }}>
      <Table data={data} columns={columns} stickyHeader sortable />
    </div>
  );
}

// Example 9: Full-Featured Table
export function FullFeaturedTableExample() {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [data] = useState<User[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', projects: 5 },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'designer', status: 'active', projects: 3 },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'client', status: 'inactive', projects: 1 },
  ]);

  const { sortedData, handleSort } = useTableSort(data);

  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      accessor: 'name',
      sortable: true,
    },
    {
      id: 'email',
      header: 'Email',
      accessor: 'email',
      sortable: true,
    },
    {
      id: 'role',
      header: 'Role',
      accessor: (row) => (
        <Badge variant="solid">
          {row.role}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => (
        <Badge variant="soft">
          {row.status}
        </Badge>
      ),
      align: 'center',
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
