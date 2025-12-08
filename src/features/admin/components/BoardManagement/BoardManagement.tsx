import { useState, useMemo } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useUsers } from '../../hooks/useUsers';
import { useBoardAssignmentMutations, useAllBoards } from '../../hooks/useBoardAssignments';
import type { User } from '../../domain';
import type { UserRole } from '@shared/config/roles';
import styles from './BoardManagement.module.css';

// Icons
const BoardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <line x1="3" y1="9" x2="21" y2="9"/>
    <line x1="9" y1="21" x2="9" y2="9"/>
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

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const ROLE_COLORS: Record<UserRole, { color: string; bg: string }> = {
  admin: { color: '#7C3AED', bg: '#EDE9FE' },
  designer: { color: '#0891B2', bg: '#CFFAFE' },
  client: { color: '#D97706', bg: '#FEF3C7' },
};

interface BoardWithMembers {
  boardId: string;
  boardName: string;
  members: Array<{
    user: User;
    isPrimary: boolean;
  }>;
}

export function BoardManagement() {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { data: allBoards, isLoading: loadingBoards } = useAllBoards();
  const { assignBoard, removeBoard, setPrimaryBoard, isAssigning } = useBoardAssignmentMutations();

  const [showAddBoard, setShowAddBoard] = useState(false);
  const [newBoardId, setNewBoardId] = useState('');
  const [newBoardName, setNewBoardName] = useState('');
  const [selectedBoard, setSelectedBoard] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Group boards with their members (all roles)
  const boardsWithMembers = useMemo((): BoardWithMembers[] => {
    if (!allBoards || !users) return [];

    const boardMap = new Map<string, BoardWithMembers>();

    allBoards.forEach((assignment) => {
      const user = users.find(u => u.id === assignment.userId);
      if (!user) return;

      const existing = boardMap.get(assignment.boardId);
      if (existing) {
        existing.members.push({
          user,
          isPrimary: assignment.isPrimary,
        });
      } else {
        boardMap.set(assignment.boardId, {
          boardId: assignment.boardId,
          boardName: assignment.boardName,
          members: [{
            user,
            isPrimary: assignment.isPrimary,
          }],
        });
      }
    });

    return Array.from(boardMap.values());
  }, [allBoards, users]);

  // Filter boards by search
  const filteredBoards = useMemo(() => {
    if (!searchQuery) return boardsWithMembers;
    const query = searchQuery.toLowerCase();
    return boardsWithMembers.filter(b =>
      b.boardName.toLowerCase().includes(query) ||
      b.boardId.toLowerCase().includes(query) ||
      b.members.some(m =>
        m.user.name.toLowerCase().includes(query) ||
        m.user.companyName?.toLowerCase().includes(query)
      )
    );
  }, [boardsWithMembers, searchQuery]);

  // Get members not assigned to selected board
  const availableMembers = useMemo(() => {
    if (!selectedBoard || !users) return users || [];
    const board = boardsWithMembers.find(b => b.boardId === selectedBoard);
    if (!board) return users || [];
    const assignedIds = new Set(board.members.map(m => m.user.id));
    return users.filter(u => !assignedIds.has(u.id));
  }, [users, selectedBoard, boardsWithMembers]);

  const handleAddBoard = async () => {
    if (!newBoardId || !newBoardName) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setShowAddBoard(false);
    // Board will appear when first member is assigned
    setSelectedBoard(newBoardId);
    setShowAddMember(true);
  };

  const handleAddMemberToBoard = async () => {
    if (!selectedBoard || !selectedMemberId) return;
    setError(null);

    const board = boardsWithMembers.find(b => b.boardId === selectedBoard);
    const boardName = board?.boardName || newBoardName || 'Board';
    const member = users?.find(u => u.id === selectedMemberId);

    try {
      await assignBoard.mutateAsync({
        userId: selectedMemberId,
        boardId: selectedBoard,
        boardName,
        // Only clients can be primary (for logo display)
        isPrimary: member?.role === 'client' && (!board || !board.members.some(m => m.user.role === 'client')),
      });
      setShowAddMember(false);
      setSelectedMemberId('');
      setNewBoardId('');
      setNewBoardName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (boardId: string, userId: string) => {
    if (!confirm('Remove this member from the board?')) return;
    try {
      await removeBoard.mutateAsync({ userId, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleSetPrimary = async (boardId: string, userId: string) => {
    try {
      await setPrimaryBoard.mutateAsync({ userId, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary');
    }
  };

  const openBoardInMiro = (boardId: string) => {
    window.open(`https://miro.com/app/board/${boardId}/`, '_blank');
  };

  if (loadingUsers || loadingBoards) {
    return <Skeleton height={300} />;
  }

  const currentBoard = selectedBoard ? boardsWithMembers.find(b => b.boardId === selectedBoard) : null;

  return (
    <div className={styles.container}>
      {/* Header with search */}
      <div className={styles.header}>
        <div className={styles.searchBox}>
          <SearchIcon />
          <input
            type="text"
            placeholder="Search boards or members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <Button onClick={() => setShowAddBoard(true)} disabled={showAddBoard}>
          <PlusIcon /> Add Board
        </Button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Add Board Form */}
      {showAddBoard && (
        <div className={styles.addBoardForm}>
          <h3 className={styles.formTitle}>Add New Board</h3>
          <p className={styles.formHint}>
            Find the Board ID in Miro: Menu &gt; Share &gt; Copy board link. The ID is the string after /board/
          </p>
          <div className={styles.formFields}>
            <Input
              label="Board ID"
              value={newBoardId}
              onChange={(e) => setNewBoardId(e.target.value)}
              placeholder="uXjVK123abc..."
            />
            <Input
              label="Board Name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Client Workspace"
            />
          </div>
          <div className={styles.formActions}>
            <Button variant="ghost" onClick={() => { setShowAddBoard(false); setNewBoardId(''); setNewBoardName(''); }}>
              Cancel
            </Button>
            <Button onClick={handleAddBoard}>
              Continue &amp; Add Members
            </Button>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* Board List */}
        <div className={styles.boardList}>
          <h3 className={styles.sectionTitle}>Boards ({filteredBoards.length})</h3>
          {filteredBoards.length === 0 ? (
            <div className={styles.emptyState}>
              <BoardIcon />
              <p>{searchQuery ? 'No boards match your search' : 'No boards yet'}</p>
              <span>{searchQuery ? 'Try a different search' : 'Add your first board to get started'}</span>
            </div>
          ) : (
            filteredBoards.map((board) => (
              <button
                key={board.boardId}
                className={`${styles.boardItem} ${selectedBoard === board.boardId ? styles.selected : ''}`}
                onClick={() => setSelectedBoard(board.boardId)}
              >
                <div className={styles.boardIcon}>
                  <BoardIcon />
                </div>
                <div className={styles.boardInfo}>
                  <span className={styles.boardName}>{board.boardName}</span>
                  <span className={styles.boardMeta}>
                    {board.members.length} member{board.members.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Board Details */}
        <div className={styles.boardDetails}>
          {selectedBoard && currentBoard ? (
            <>
              <div className={styles.detailsHeader}>
                <div>
                  <h3 className={styles.detailsTitle}>{currentBoard.boardName}</h3>
                  <div className={styles.boardIdRow}>
                    <span className={styles.boardId}>{currentBoard.boardId}</span>
                    <button
                      className={styles.openBoardButton}
                      onClick={() => openBoardInMiro(currentBoard.boardId)}
                      title="Open in Miro"
                    >
                      <ExternalLinkIcon /> Open in Miro
                    </button>
                  </div>
                </div>
                <Button size="sm" onClick={() => setShowAddMember(true)}>
                  <PlusIcon /> Add Member
                </Button>
              </div>

              <div className={styles.membersSection}>
                <h4 className={styles.membersTitle}>Assigned Members</h4>
                {currentBoard.members.length === 0 ? (
                  <p className={styles.noMembers}>No members assigned yet</p>
                ) : (
                  <div className={styles.membersList}>
                    {currentBoard.members.map(({ user, isPrimary }) => (
                      <div key={user.id} className={`${styles.memberCard} ${isPrimary ? styles.primary : ''}`}>
                        <div
                          className={styles.memberAvatar}
                          style={{ backgroundColor: user.companyLogoUrl || user.avatarUrl ? 'white' : ROLE_COLORS[user.role].color }}
                        >
                          {user.companyLogoUrl ? (
                            <img src={user.companyLogoUrl} alt={user.companyName || user.name} />
                          ) : user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} />
                          ) : (
                            <span>{(user.companyName || user.name)?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.memberInfo}>
                          <span className={styles.memberName}>
                            {user.role === 'client' && user.companyName ? user.companyName : user.name}
                            <span
                              className={styles.roleBadge}
                              style={{
                                backgroundColor: ROLE_COLORS[user.role].bg,
                                color: ROLE_COLORS[user.role].color,
                              }}
                            >
                              {user.role}
                            </span>
                            {isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                          </span>
                          <span className={styles.memberEmail}>{user.email}</span>
                        </div>
                        <div className={styles.memberActions}>
                          {user.role === 'client' && !isPrimary && (
                            <button
                              className={styles.actionButton}
                              onClick={() => handleSetPrimary(currentBoard.boardId, user.id)}
                              title="Set as primary (shows logo in dashboard)"
                            >
                              <StarIcon />
                            </button>
                          )}
                          {isPrimary && (
                            <button
                              className={`${styles.actionButton} ${styles.primaryStar}`}
                              title="Primary client (logo shown)"
                              disabled
                            >
                              <StarIcon filled />
                            </button>
                          )}
                          <button
                            className={`${styles.actionButton} ${styles.danger}`}
                            onClick={() => handleRemoveMember(currentBoard.boardId, user.id)}
                            title="Remove from board"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : selectedBoard && !currentBoard ? (
            // New board being added
            <div className={styles.detailsHeader}>
              <div>
                <h3 className={styles.detailsTitle}>{newBoardName || 'New Board'}</h3>
                <span className={styles.boardId}>{selectedBoard}</span>
              </div>
              <Button size="sm" onClick={() => setShowAddMember(true)}>
                <PlusIcon /> Add Member
              </Button>
            </div>
          ) : (
            <div className={styles.selectPrompt}>
              <BoardIcon />
              <p>Select a board to manage its members</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMember && selectedBoard && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Add Member to Board</h3>
            {availableMembers.length === 0 ? (
              <p className={styles.noAvailable}>All members are already assigned to this board</p>
            ) : (
              <div className={styles.memberSelect}>
                <label className={styles.selectLabel}>Select Member</label>
                <select
                  className={styles.select}
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                >
                  <option value="">Choose a member...</option>
                  {availableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      [{member.role}] {member.companyName || member.name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => { setShowAddMember(false); setSelectedMemberId(''); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddMemberToBoard}
                isLoading={isAssigning}
                disabled={!selectedMemberId}
              >
                Add Member
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
