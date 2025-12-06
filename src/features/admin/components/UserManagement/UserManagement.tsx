import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useUsers, useUserMutations } from '../../hooks';
import { isMainAdmin } from '@shared/config/env';
import { createLogger } from '@shared/lib/logger';
import type { User, CreateUserInput, UserRole } from '../../domain';
import styles from './UserManagement.module.css';

const logger = createLogger('UserManagement');

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'designer', label: 'Designer' },
  { value: 'client', label: 'Client' },
];

// User icon for avatar placeholder
const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

export function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const { createUser, updateUser, deleteUser, isCreating, isDeleting } = useUserMutations();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<CreateUserInput>({
    email: '',
    name: '',
    role: 'client',
    avatarUrl: '',
    miroUserId: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);
    try {
      await createUser.mutateAsync(formData);
      setShowCreateForm(false);
      setFormData({ email: '', name: '', role: 'client', avatarUrl: '', miroUserId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    setError(null);
    try {
      await updateUser.mutateAsync({
        id: editingUser.id,
        input: {
          name: formData.name,
          role: formData.role as UserRole,
          avatarUrl: formData.avatarUrl || null,
          miroUserId: formData.miroUserId || null,
        },
      });
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async (user: User) => {
    logger.debug('handleDelete called', { name: user.name, id: user.id });

    if (isMainAdmin(user.email)) {
      logger.warn('Attempted to delete main admin');
      setError('Cannot delete the main admin');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete ${user.name}?`);
    if (!confirmed) {
      logger.debug('Delete cancelled by user');
      return;
    }

    try {
      logger.debug('Deleting user...', { id: user.id });
      await deleteUser.mutateAsync(user.id);
      logger.info('User deleted successfully', { id: user.id, name: user.name });
    } catch (err) {
      logger.error('Delete failed', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl || '',
      miroUserId: user.miroUserId || '',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton height={200} />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>User Management</h2>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          Add User
        </Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {showCreateForm && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>Create New User</h3>
          <div className={styles.formContent}>
            {/* Avatar Preview */}
            <div className={styles.avatarUpload}>
              <div className={styles.avatarButton}>
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Avatar preview" className={styles.avatarImage} />
                ) : (
                  <div className={styles.avatarPlaceholder}>
                    <UserIcon />
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGrid}>
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@example.com"
              />
              <div className={styles.field}>
                <label className={styles.label}>Role</label>
                <select
                  className={styles.select}
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Avatar URL (optional)"
                value={formData.avatarUrl || ''}
                onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                placeholder="https://example.com/avatar.jpg"
              />
              <Input
                label="Miro User ID (optional)"
                value={formData.miroUserId || ''}
                onChange={(e) => setFormData({ ...formData, miroUserId: e.target.value })}
                placeholder="e.g., 3458764647297922215"
              />
            </div>
            <p className={styles.hint} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              The Miro User ID will be shown when a user tries to access the app. Ask them to share this ID with you.
            </p>
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating}>
              Create User
            </Button>
          </div>
        </div>
      )}

      <div className={styles.table}>
        <div className={styles.tableHeader}>
          <span>Name</span>
          <span>Email</span>
          <span>Role</span>
          <span>Actions</span>
        </div>
        {(!users || users.length === 0) && (
          <div className={styles.empty}>No users found. Add your first user above.</div>
        )}
        {users?.map((user) => (
          <div key={user.id} className={styles.tableRow}>
            {editingUser?.id === user.id ? (
              <div className={styles.editingRow}>
                {/* Avatar Preview */}
                <div className={styles.avatarUploadSmall}>
                  <div className={styles.avatarButtonSmall}>
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Avatar preview" className={styles.avatarImageSmall} />
                    ) : (
                      <div className={styles.avatarPlaceholderSmall}>
                        <UserIcon />
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.editFields}>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Name"
                  />
                  <span className={styles.email}>{user.email}</span>
                  <select
                    className={styles.select}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                    disabled={isMainAdmin(user.email)}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={formData.avatarUrl || ''}
                    onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                    placeholder="Avatar URL"
                  />
                  <Input
                    value={formData.miroUserId || ''}
                    onChange={(e) => setFormData({ ...formData, miroUserId: e.target.value })}
                    placeholder="Miro User ID"
                  />
                </div>
                <div className={styles.actions}>
                  <Button size="sm" onClick={handleUpdate}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingUser(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.userRow}>
                {/* User Avatar */}
                <div className={styles.userAvatar}>
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name} />
                  ) : (
                    <span>{user.name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className={styles.userInfo}>
                  <span className={styles.name}>
                    {user.name}
                    {isMainAdmin(user.email) && (
                      <span className={styles.badge}>Super Admin</span>
                    )}
                  </span>
                  <span className={styles.email}>{user.email}</span>
                  <span className={`${styles.role} ${user.role ? styles[user.role] : ''}`}>
                    {user.role || 'No role'}
                  </span>
                  {user.miroUserId && (
                    <span className={styles.miroId} style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                      Miro: {user.miroUserId.slice(0, 10)}...
                    </span>
                  )}
                </div>
                <div className={styles.actions}>
                  <Button size="sm" variant="ghost" onClick={() => startEditing(user)}>
                    Edit
                  </Button>
                  {!isMainAdmin(user.email) && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(user)}
                      isLoading={isDeleting}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
