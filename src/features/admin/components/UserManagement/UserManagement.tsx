import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useUsers, useUserMutations } from '../../hooks';
import { isMainAdmin } from '@shared/config/env';
import type { UserRole } from '@shared/config/roles';
import { createLogger } from '@shared/lib/logger';
import type { User, CreateUserInput } from '../../domain';
import styles from './UserManagement.module.css';

const logger = createLogger('ClientManagement');

// Building icon for company
const BuildingIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
  </svg>
);

interface ClientFormData {
  email: string;
  name: string;
  companyName: string;
  companyLogoUrl: string;
  miroUserId: string;
}

const emptyFormData: ClientFormData = {
  email: '',
  name: '',
  companyName: '',
  companyLogoUrl: '',
  miroUserId: '',
};

export function UserManagement() {
  // Filter to only show clients
  const { data: allUsers, isLoading } = useUsers();
  const clients = allUsers?.filter(u => u.role === 'client') || [];

  const { createUser, updateUser, deleteUser, isCreating, isDeleting } = useUserMutations();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(emptyFormData);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setError(null);

    if (!formData.email || !formData.name) {
      setError('Email and Name are required');
      return;
    }

    try {
      const input: CreateUserInput = {
        email: formData.email,
        name: formData.name,
        role: 'client' as UserRole,
        companyName: formData.companyName || null,
        companyLogoUrl: formData.companyLogoUrl || null,
        miroUserId: formData.miroUserId || null,
      };
      await createUser.mutateAsync(input);
      setShowCreateForm(false);
      setFormData(emptyFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
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
          companyName: formData.companyName || null,
          companyLogoUrl: formData.companyLogoUrl || null,
          miroUserId: formData.miroUserId || null,
        },
      });
      setEditingUser(null);
      setFormData(emptyFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client');
    }
  };

  const handleDelete = async (user: User) => {
    logger.debug('handleDelete called', { name: user.name, id: user.id });

    if (isMainAdmin(user.email)) {
      setError('Cannot delete this user');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete ${user.name}?`);
    if (!confirmed) return;

    try {
      await deleteUser.mutateAsync(user.id);
      logger.info('Client deleted', { id: user.id, name: user.name });
    } catch (err) {
      logger.error('Delete failed', err);
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    }
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      companyName: user.companyName || '',
      companyLogoUrl: user.companyLogoUrl || '',
      miroUserId: user.miroUserId || '',
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setFormData(emptyFormData);
  };

  const cancelCreate = () => {
    setShowCreateForm(false);
    setFormData(emptyFormData);
    setError(null);
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
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Clients</h2>
          <span className={styles.count}>{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
        </div>
        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          Add Client
        </Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Create Form */}
      {showCreateForm && (
        <div className={styles.form}>
          <h3 className={styles.formTitle}>New Client</h3>
          <div className={styles.formContent}>
            {/* Logo Preview */}
            <div className={styles.logoPreview}>
              {formData.companyLogoUrl ? (
                <img src={formData.companyLogoUrl} alt="Company logo" className={styles.logoImage} />
              ) : (
                <div className={styles.logoPlaceholder}>
                  <BuildingIcon />
                </div>
              )}
            </div>

            <div className={styles.formFields}>
              <div className={styles.fieldRow}>
                <Input
                  label="Contact Name *"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Smith"
                />
                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@company.com"
                />
              </div>

              <div className={styles.fieldRow}>
                <Input
                  label="Company Name"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Acme Corporation"
                />
                <Input
                  label="Company Logo URL"
                  value={formData.companyLogoUrl}
                  onChange={(e) => setFormData({ ...formData, companyLogoUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <Input
                label="Miro User ID"
                value={formData.miroUserId}
                onChange={(e) => setFormData({ ...formData, miroUserId: e.target.value })}
                placeholder="Shown when client tries to access the app"
              />
            </div>
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={cancelCreate}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating}>
              Create Client
            </Button>
          </div>
        </div>
      )}

      {/* Client List */}
      <div className={styles.clientList}>
        {clients.length === 0 && !showCreateForm && (
          <div className={styles.empty}>
            <BuildingIcon />
            <p>No clients yet</p>
            <span>Add your first client to get started</span>
          </div>
        )}

        {clients.map((client) => (
          <div key={client.id} className={styles.clientCard}>
            {editingUser?.id === client.id ? (
              // Editing Mode
              <div className={styles.editForm}>
                <div className={styles.editLogoPreview}>
                  {formData.companyLogoUrl ? (
                    <img src={formData.companyLogoUrl} alt="Logo" className={styles.editLogoImage} />
                  ) : (
                    <div className={styles.editLogoPlaceholder}>
                      {formData.companyName?.charAt(0) || formData.name?.charAt(0) || 'C'}
                    </div>
                  )}
                </div>
                <div className={styles.editFields}>
                  <Input
                    label="Contact Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Company Name"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  />
                  <Input
                    label="Company Logo URL"
                    value={formData.companyLogoUrl}
                    onChange={(e) => setFormData({ ...formData, companyLogoUrl: e.target.value })}
                  />
                  <Input
                    label="Miro User ID"
                    value={formData.miroUserId}
                    onChange={(e) => setFormData({ ...formData, miroUserId: e.target.value })}
                  />
                </div>
                <div className={styles.editActions}>
                  <Button size="sm" onClick={handleUpdate}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={cancelEditing}>Cancel</Button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div className={styles.clientDisplay}>
                <div className={styles.clientLogo}>
                  {client.companyLogoUrl ? (
                    <img src={client.companyLogoUrl} alt={client.companyName || client.name} />
                  ) : (
                    <span>{(client.companyName || client.name)?.charAt(0).toUpperCase() || 'C'}</span>
                  )}
                </div>
                <div className={styles.clientInfo}>
                  <h4 className={styles.clientCompany}>
                    {client.companyName || client.name}
                  </h4>
                  <span className={styles.clientContact}>{client.name}</span>
                  <span className={styles.clientEmail}>{client.email}</span>
                  {client.miroUserId && (
                    <span className={styles.clientMiro}>
                      Miro: {client.miroUserId.slice(0, 12)}...
                    </span>
                  )}
                </div>
                <div className={styles.clientActions}>
                  <Button size="sm" variant="ghost" onClick={() => startEditing(client)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(client)}
                    isLoading={isDeleting}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
