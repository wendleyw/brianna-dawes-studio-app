import { useState } from 'react';
import styles from './UsersTab.module.css';

export default function UsersTab() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Mock data
  const users = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'admin',
      projectCount: 24,
      lastActive: '2 minutes ago',
      status: 'active',
      avatarUrl: undefined,
    },
    {
      id: '2',
      name: 'Sarah Miller',
      email: 'sarah@example.com',
      role: 'designer',
      projectCount: 5,
      lastActive: '1 hour ago',
      status: 'active',
      avatarUrl: undefined,
    },
    {
      id: '3',
      name: 'Client Corp.',
      email: 'contact@client.com',
      role: 'client',
      projectCount: 2,
      lastActive: '3 days ago',
      status: 'pending',
      avatarUrl: undefined,
    },
    {
      id: '4',
      name: 'Mike Designer',
      email: 'mike@example.com',
      role: 'designer',
      projectCount: 8,
      lastActive: '10 minutes ago',
      status: 'active',
      avatarUrl: undefined,
    },
  ];

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return styles.roleAdmin;
      case 'designer':
        return styles.roleDesigner;
      case 'client':
        return styles.roleClient;
      default:
        return '';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'pending':
        return styles.statusPending;
      case 'inactive':
        return styles.statusInactive;
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerActions}>
          <button className={styles.addButton}>+ Add User</button>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="🔍 Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="designer">Designer</option>
            <option value="client">Client</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.checkboxCell}>
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users.length}
                  onChange={handleSelectAll}
                />
              </th>
              <th>Name</th>
              <th>Role</th>
              <th>Projects</th>
              <th>Last Active</th>
              <th>Status</th>
              <th className={styles.actionsCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className={styles.tableRow}>
                <td className={styles.checkboxCell}>
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleSelectUser(user.id)}
                  />
                </td>
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.userInfo}>
                      <div className={styles.userName}>{user.name}</div>
                      <div className={styles.userEmail}>{user.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`${styles.roleBadge} ${getRoleColor(user.role)}`}>
                    {user.role}
                  </span>
                </td>
                <td className={styles.projectCount}>{user.projectCount}</td>
                <td className={styles.lastActive}>{user.lastActive}</td>
                <td>
                  <span className={`${styles.statusBadge} ${getStatusColor(user.status)}`}>
                    {user.status}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <button className={styles.actionButton} title="Edit user">
                    ✏️
                  </button>
                  <button className={styles.actionButton} title="View details">
                    👁️
                  </button>
                  <button className={styles.actionButton} title="Delete user">
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUsers.length > 0 && (
        <div className={styles.bulkActions}>
          <span className={styles.bulkActionsLabel}>
            {selectedUsers.length} selected
          </span>
          <div className={styles.bulkActionsButtons}>
            <button className={styles.bulkActionButton}>Change Role</button>
            <button className={styles.bulkActionButton}>Deactivate</button>
            <button className={styles.bulkActionButton}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
