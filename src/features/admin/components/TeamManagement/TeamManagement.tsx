import { useState, useMemo } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useUsers, useUserMutations } from '../../hooks';
import { useAllBoards, useBoards, useBoardAssignmentMutations } from '../../hooks/useBoardAssignments';
import { isMainAdmin } from '@shared/config/env';
import type { UserRole } from '@shared/config/roles';
import { createLogger } from '@shared/lib/logger';
import type { User, CreateUserInput } from '../../domain';
import styles from './TeamManagement.module.css';

const logger = createLogger('TeamManagement');

// Icons
const AdminIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

const DesignerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/>
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
    <path d="M2 2l7.586 7.586"/>
    <circle cx="11" cy="11" r="2"/>
  </svg>
);

const ClientIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="2" width="16" height="20" rx="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/>
    <path d="m21 21-4.35-4.35"/>
  </svg>
);

const BoardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

type RoleFilter = 'all' | UserRole;

interface MemberFormData {
  email: string;
  name: string;
  role: UserRole;
  companyName: string;
  companyLogoUrl: string;
  miroUserId: string;
}

const emptyFormData: MemberFormData = {
  email: '',
  name: '',
  role: 'client',
  companyName: '',
  companyLogoUrl: '',
  miroUserId: '',
};

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  admin: { label: 'Admin', color: '#7C3AED', bgColor: '#EDE9FE', icon: <AdminIcon /> },
  designer: { label: 'Designer', color: '#0891B2', bgColor: '#CFFAFE', icon: <DesignerIcon /> },
  client: { label: 'Client', color: '#D97706', bgColor: '#FEF3C7', icon: <ClientIcon /> },
};

export function TeamManagement() {
  const { data: allUsers, isLoading } = useUsers();
  const { data: allBoardAssignments } = useAllBoards();
  const { data: masterBoards } = useBoards();
  const { createUser, updateUser, deleteUser, isCreating, isDeleting } = useUserMutations();
  const { assignBoard, removeBoard, setPrimaryBoard, isAssigning } = useBoardAssignmentMutations();

  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<MemberFormData>(emptyFormData);
  const [error, setError] = useState<string | null>(null);

  // Board assignment state
  const [assignBoardUserId, setAssignBoardUserId] = useState<string | null>(null);
  const [selectedExistingBoardId, setSelectedExistingBoardId] = useState<string>('');
  const [newBoardId, setNewBoardId] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [boardAssignMode, setBoardAssignMode] = useState<'select' | 'new'>('select');

  // Filter users by role and search
  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];

    return allUsers.filter(user => {
      // Role filter
      if (roleFilter !== 'all' && user.role !== roleFilter) return false;

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = user.name.toLowerCase().includes(query);
        const matchesEmail = user.email.toLowerCase().includes(query);
        const matchesCompany = user.companyName?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesCompany) return false;
      }

      return true;
    });
  }, [allUsers, roleFilter, searchQuery]);

  // Get boards for a specific user
  const getUserBoards = (userId: string) => {
    if (!allBoardAssignments) return [];
    return allBoardAssignments.filter(b => b.userId === userId);
  };

  // Get boards the user is NOT assigned to
  const getAvailableBoards = (userId: string) => {
    if (!masterBoards) return [];
    const userBoardIds = new Set(getUserBoards(userId).map(b => b.boardId));
    return masterBoards.filter(b => !userBoardIds.has(b.id));
  };

  // Count users by role
  const roleCounts = useMemo(() => {
    if (!allUsers) return { all: 0, admin: 0, designer: 0, client: 0 };
    return {
      all: allUsers.length,
      admin: allUsers.filter(u => u.role === 'admin').length,
      designer: allUsers.filter(u => u.role === 'designer').length,
      client: allUsers.filter(u => u.role === 'client').length,
    };
  }, [allUsers]);

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
        role: formData.role,
        companyName: formData.companyName || null,
        companyLogoUrl: formData.companyLogoUrl || null,
        miroUserId: formData.miroUserId || null,
      };
      await createUser.mutateAsync(input);
      setShowCreateForm(false);
      setFormData(emptyFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create member');
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
          role: formData.role,
          companyName: formData.companyName || null,
          companyLogoUrl: formData.companyLogoUrl || null,
          miroUserId: formData.miroUserId || null,
        },
      });
      setEditingUser(null);
      setFormData(emptyFormData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member');
    }
  };

  const handleDelete = async (user: User) => {
    logger.debug('handleDelete called', { name: user.name, id: user.id });

    if (isMainAdmin(user.email)) {
      setError('Cannot delete this user');
      return;
    }

    if (user.isSuperAdmin) {
      setError('Cannot delete super admin');
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete ${user.name}?`);
    if (!confirmed) return;

    try {
      await deleteUser.mutateAsync(user.id);
      logger.info('Member deleted', { id: user.id, name: user.name });
    } catch (err) {
      logger.error('Delete failed', err);
      setError(err instanceof Error ? err.message : 'Failed to delete member');
    }
  };

  const handleAssignBoard = async () => {
    if (!assignBoardUserId) return;
    setError(null);

    let boardId: string;
    let boardName: string;

    if (boardAssignMode === 'select') {
      if (!selectedExistingBoardId) {
        setError('Please select a board');
        return;
      }
      const board = masterBoards?.find(b => b.id === selectedExistingBoardId);
      if (!board) {
        setError('Board not found');
        return;
      }
      boardId = board.id;
      boardName = board.name;
    } else {
      if (!newBoardId || !newBoardName) {
        setError('Board ID and Name are required');
        return;
      }
      boardId = newBoardId;
      boardName = newBoardName;
    }

    try {
      await assignBoard.mutateAsync({
        userId: assignBoardUserId,
        boardId,
        boardName,
        isPrimary: getUserBoards(assignBoardUserId).length === 0,
      });
      closeAssignBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign board');
    }
  };

  const handleRemoveBoard = async (userId: string, boardId: string) => {
    if (!confirm('Remove this board assignment?')) return;
    try {
      await removeBoard.mutateAsync({ userId, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove board');
    }
  };

  const handleSetPrimary = async (userId: string, boardId: string) => {
    try {
      await setPrimaryBoard.mutateAsync({ userId, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary board');
    }
  };

  const openAssignBoard = (userId: string) => {
    setAssignBoardUserId(userId);
    setSelectedExistingBoardId('');
    setNewBoardId('');
    setNewBoardName('');
    setBoardAssignMode('select');
    setError(null);
  };

  const closeAssignBoard = () => {
    setAssignBoardUserId(null);
    setSelectedExistingBoardId('');
    setNewBoardId('');
    setNewBoardName('');
  };

  const startEditing = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      name: user.name,
      role: user.role,
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

  const openCreateWithRole = (role: UserRole) => {
    setFormData({ ...emptyFormData, role });
    setShowCreateForm(true);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Skeleton height={400} />
      </div>
    );
  }

  const assigningUser = assignBoardUserId ? allUsers?.find(u => u.id === assignBoardUserId) : null;
  const availableBoards = assignBoardUserId ? getAvailableBoards(assignBoardUserId) : [];

  return (
    <div className={styles.container}>
      {/* Header with search and add button */}
      <div className={styles.header}>
        <div className={styles.searchBox}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <div className={styles.addButtonGroup}>
          <Button onClick={() => openCreateWithRole('admin')} variant="ghost" size="sm">
            <PlusIcon /> Admin
          </Button>
          <Button onClick={() => openCreateWithRole('designer')} variant="ghost" size="sm">
            <PlusIcon /> Designer
          </Button>
          <Button onClick={() => openCreateWithRole('client')} size="sm">
            <PlusIcon /> Client
          </Button>
        </div>
      </div>

      {/* Role filter tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${roleFilter === 'all' ? styles.active : ''}`}
          onClick={() => setRoleFilter('all')}
        >
          All <span className={styles.badge}>{roleCounts.all}</span>
        </button>
        <button
          className={`${styles.filterTab} ${roleFilter === 'admin' ? styles.active : ''}`}
          onClick={() => setRoleFilter('admin')}
        >
          <AdminIcon /> Admins <span className={styles.badge}>{roleCounts.admin}</span>
        </button>
        <button
          className={`${styles.filterTab} ${roleFilter === 'designer' ? styles.active : ''}`}
          onClick={() => setRoleFilter('designer')}
        >
          <DesignerIcon /> Designers <span className={styles.badge}>{roleCounts.designer}</span>
        </button>
        <button
          className={`${styles.filterTab} ${roleFilter === 'client' ? styles.active : ''}`}
          onClick={() => setRoleFilter('client')}
        >
          <ClientIcon /> Clients <span className={styles.badge}>{roleCounts.client}</span>
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Create Form */}
      {showCreateForm && (
        <div className={styles.form}>
          <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>
              Add New {ROLE_CONFIG[formData.role].label}
            </h3>
            <div className={styles.roleSelector}>
              {(['admin', 'designer', 'client'] as UserRole[]).map(role => (
                <button
                  key={role}
                  className={`${styles.roleButton} ${formData.role === role ? styles.roleActive : ''}`}
                  onClick={() => setFormData({ ...formData, role })}
                  style={{
                    '--role-color': ROLE_CONFIG[role].color,
                    '--role-bg': ROLE_CONFIG[role].bgColor,
                  } as React.CSSProperties}
                >
                  {ROLE_CONFIG[role].icon}
                  {ROLE_CONFIG[role].label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formContent}>
            {/* Logo Preview for Clients */}
            {formData.role === 'client' && (
              <div className={styles.logoPreview}>
                {formData.companyLogoUrl ? (
                  <img src={formData.companyLogoUrl} alt="Company logo" className={styles.logoImage} />
                ) : (
                  <div className={styles.logoPlaceholder}>
                    <ClientIcon />
                  </div>
                )}
              </div>
            )}

            <div className={styles.formFields}>
              <div className={styles.fieldRow}>
                <Input
                  label="Name *"
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

              {formData.role === 'client' && (
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
              )}

              <Input
                label="Miro User ID"
                value={formData.miroUserId}
                onChange={(e) => setFormData({ ...formData, miroUserId: e.target.value })}
                placeholder="Shown when user tries to access the app"
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="ghost" onClick={cancelCreate}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating}>
              Create {ROLE_CONFIG[formData.role].label}
            </Button>
          </div>
        </div>
      )}

      {/* Member List */}
      <div className={styles.memberList}>
        {filteredUsers.length === 0 && !showCreateForm && (
          <div className={styles.empty}>
            <ClientIcon />
            <p>No members found</p>
            <span>{searchQuery ? 'Try a different search' : 'Add your first team member to get started'}</span>
          </div>
        )}

        {filteredUsers.map((member) => (
          <div key={member.id} className={styles.memberCard}>
            {editingUser?.id === member.id ? (
              // Editing Mode
              <div className={styles.editForm}>
                <div className={styles.editLogoPreview}>
                  {formData.companyLogoUrl ? (
                    <img src={formData.companyLogoUrl} alt="Logo" className={styles.editLogoImage} />
                  ) : (
                    <div
                      className={styles.editLogoPlaceholder}
                      style={{ backgroundColor: ROLE_CONFIG[formData.role].color }}
                    >
                      {formData.name?.charAt(0) || 'M'}
                    </div>
                  )}
                </div>
                <div className={styles.editFields}>
                  <div className={styles.editRoleSelector}>
                    {(['admin', 'designer', 'client'] as UserRole[]).map(role => (
                      <button
                        key={role}
                        className={`${styles.roleChip} ${formData.role === role ? styles.roleChipActive : ''}`}
                        onClick={() => setFormData({ ...formData, role })}
                        style={{
                          '--role-color': ROLE_CONFIG[role].color,
                          '--role-bg': ROLE_CONFIG[role].bgColor,
                        } as React.CSSProperties}
                      >
                        {ROLE_CONFIG[role].label}
                      </button>
                    ))}
                  </div>
                  <Input
                    label="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  {formData.role === 'client' && (
                    <>
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
                    </>
                  )}
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
              <div className={styles.memberDisplay}>
                <div
                  className={styles.memberAvatar}
                  style={{ backgroundColor: member.companyLogoUrl ? 'white' : ROLE_CONFIG[member.role].color }}
                >
                  {member.companyLogoUrl ? (
                    <img src={member.companyLogoUrl} alt={member.companyName || member.name} />
                  ) : member.avatarUrl ? (
                    <img src={member.avatarUrl} alt={member.name} />
                  ) : (
                    <span>{(member.companyName || member.name)?.charAt(0).toUpperCase() || 'M'}</span>
                  )}
                </div>
                <div className={styles.memberInfo}>
                  <div className={styles.memberNameRow}>
                    <h4 className={styles.memberName}>
                      {member.role === 'client' && member.companyName ? member.companyName : member.name}
                    </h4>
                    <span
                      className={styles.roleBadge}
                      style={{
                        backgroundColor: ROLE_CONFIG[member.role].bgColor,
                        color: ROLE_CONFIG[member.role].color,
                      }}
                    >
                      {ROLE_CONFIG[member.role].icon}
                      {ROLE_CONFIG[member.role].label}
                    </span>
                    {member.isSuperAdmin && (
                      <span className={styles.superBadge}>Super</span>
                    )}
                  </div>
                  {member.role === 'client' && member.companyName && (
                    <span className={styles.memberContact}>{member.name}</span>
                  )}
                  <span className={styles.memberEmail}>{member.email}</span>

                  {/* Boards assigned */}
                  <div className={styles.boardsSection}>
                    <div className={styles.boardsHeader}>
                      <span className={styles.boardsLabel}>Boards:</span>
                      <button
                        className={styles.addBoardBtn}
                        onClick={() => openAssignBoard(member.id)}
                        title="Assign to board"
                      >
                        <PlusIcon /> Add
                      </button>
                    </div>
                    {getUserBoards(member.id).length > 0 ? (
                      <div className={styles.boardsList}>
                        {getUserBoards(member.id).map(board => (
                          <div key={board.id} className={`${styles.boardChip} ${board.isPrimary ? styles.primaryBoard : ''}`}>
                            <BoardIcon />
                            <span className={styles.boardChipName}>{board.boardName}</span>
                            {board.isPrimary && (
                              <span className={styles.primaryLabel}>
                                <StarIcon filled /> Primary
                              </span>
                            )}
                            {!board.isPrimary && member.role === 'client' && (
                              <button
                                className={styles.chipAction}
                                onClick={() => handleSetPrimary(member.id, board.boardId)}
                                title="Set as primary"
                              >
                                <StarIcon />
                              </button>
                            )}
                            <button
                              className={styles.chipAction}
                              onClick={() => handleRemoveBoard(member.id, board.boardId)}
                              title="Remove from board"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className={styles.noBoards}>No boards assigned</span>
                    )}
                  </div>
                </div>
                <div className={styles.memberActions}>
                  <Button size="sm" variant="ghost" onClick={() => startEditing(member)}>
                    Edit
                  </Button>
                  {!member.isSuperAdmin && !isMainAdmin(member.email) && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDelete(member)}
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

      {/* Assign Board Modal */}
      {assignBoardUserId && assigningUser && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>
              Assign Board to {assigningUser.companyName || assigningUser.name}
            </h3>

            {/* Current boards */}
            {getUserBoards(assignBoardUserId).length > 0 && (
              <div className={styles.currentBoards}>
                <span className={styles.currentBoardsLabel}>Currently assigned:</span>
                <div className={styles.currentBoardsList}>
                  {getUserBoards(assignBoardUserId).map(b => (
                    <span key={b.id} className={styles.currentBoardChip}>
                      {b.boardName}
                      {b.isPrimary && <StarIcon filled />}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Mode tabs */}
            <div className={styles.modeTabs}>
              <button
                className={`${styles.modeTab} ${boardAssignMode === 'select' ? styles.modeTabActive : ''}`}
                onClick={() => setBoardAssignMode('select')}
              >
                Select Existing Board
              </button>
              <button
                className={`${styles.modeTab} ${boardAssignMode === 'new' ? styles.modeTabActive : ''}`}
                onClick={() => setBoardAssignMode('new')}
              >
                Add New Board
              </button>
            </div>

            {boardAssignMode === 'select' ? (
              <div className={styles.assignFields}>
                {availableBoards.length > 0 ? (
                  <div className={styles.selectField}>
                    <label className={styles.selectLabel}>Select Board</label>
                    <select
                      className={styles.select}
                      value={selectedExistingBoardId}
                      onChange={(e) => setSelectedExistingBoardId(e.target.value)}
                    >
                      <option value="">Choose a board...</option>
                      {availableBoards.map(board => (
                        <option key={board.id} value={board.id}>
                          {board.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className={styles.noAvailableBoards}>
                    {masterBoards && masterBoards.length > 0
                      ? 'User is already assigned to all available boards'
                      : 'No boards available. Add a new board first.'}
                  </p>
                )}
              </div>
            ) : (
              <div className={styles.assignFields}>
                <Input
                  label="Board ID"
                  value={newBoardId}
                  onChange={(e) => setNewBoardId(e.target.value)}
                  placeholder="uXjVK123abc..."
                />
                <p className={styles.hint}>
                  Find in Miro: Menu → Share → Copy board link. The ID is after /board/
                </p>
                <Input
                  label="Board Name"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="Client Workspace"
                />
              </div>
            )}

            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={closeAssignBoard}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignBoard}
                isLoading={isAssigning}
                disabled={
                  boardAssignMode === 'select'
                    ? !selectedExistingBoardId
                    : !newBoardId || !newBoardName
                }
              >
                Assign Board
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
