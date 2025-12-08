import { useState, useMemo } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useUsers } from '../../hooks/useUsers';
import { useBoardAssignmentMutations, useAllBoards } from '../../hooks/useBoardAssignments';
import type { User } from '../../domain';
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

interface BoardWithClients {
  boardId: string;
  boardName: string;
  clients: Array<{
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
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Get all client users
  const clientUsers = useMemo(() =>
    users?.filter((u) => u.role === 'client') || [],
    [users]
  );

  // Group boards with their clients
  const boardsWithClients = useMemo((): BoardWithClients[] => {
    if (!allBoards || !users) return [];

    const boardMap = new Map<string, BoardWithClients>();

    allBoards.forEach((assignment) => {
      const user = users.find(u => u.id === assignment.userId);
      if (!user || user.role !== 'client') return;

      const existing = boardMap.get(assignment.boardId);
      if (existing) {
        existing.clients.push({
          user,
          isPrimary: assignment.isPrimary,
        });
      } else {
        boardMap.set(assignment.boardId, {
          boardId: assignment.boardId,
          boardName: assignment.boardName,
          clients: [{
            user,
            isPrimary: assignment.isPrimary,
          }],
        });
      }
    });

    return Array.from(boardMap.values());
  }, [allBoards, users]);

  // Get clients not assigned to selected board
  const availableClients = useMemo(() => {
    if (!selectedBoard) return clientUsers;
    const board = boardsWithClients.find(b => b.boardId === selectedBoard);
    if (!board) return clientUsers;
    const assignedIds = new Set(board.clients.map(c => c.user.id));
    return clientUsers.filter(c => !assignedIds.has(c.id));
  }, [clientUsers, selectedBoard, boardsWithClients]);

  const handleAddBoard = async () => {
    if (!newBoardId || !newBoardName) {
      setError('Please fill in all fields');
      return;
    }
    setError(null);
    setShowAddBoard(false);
    setNewBoardId('');
    setNewBoardName('');
    // Board will appear when first client is assigned
    setSelectedBoard(newBoardId);
    setShowAddClient(true);
  };

  const handleAddClientToBoard = async () => {
    if (!selectedBoard || !selectedClientId) return;
    setError(null);

    const board = boardsWithClients.find(b => b.boardId === selectedBoard);
    const boardName = board?.boardName || newBoardName || 'Board';

    try {
      await assignBoard.mutateAsync({
        userId: selectedClientId,
        boardId: selectedBoard,
        boardName,
        isPrimary: !board || board.clients.length === 0, // First client is primary
      });
      setShowAddClient(false);
      setSelectedClientId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add client');
    }
  };

  const handleRemoveClient = async (boardId: string, userId: string) => {
    if (!confirm('Remove this client from the board?')) return;
    try {
      await removeBoard.mutateAsync({ userId, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove client');
    }
  };

  const handleSetPrimary = async (boardId: string, userId: string) => {
    try {
      await setPrimaryBoard.mutateAsync({ userId, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary');
    }
  };

  if (loadingUsers || loadingBoards) {
    return <Skeleton height={300} />;
  }

  const currentBoard = selectedBoard ? boardsWithClients.find(b => b.boardId === selectedBoard) : null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Board Management</h2>
          <p className={styles.subtitle}>
            Manage Miro boards and assign multiple clients. The primary client's logo appears in the dashboard.
          </p>
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
            <Button variant="ghost" onClick={() => setShowAddBoard(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBoard}>
              Continue
            </Button>
          </div>
        </div>
      )}

      <div className={styles.layout}>
        {/* Board List */}
        <div className={styles.boardList}>
          <h3 className={styles.sectionTitle}>Boards ({boardsWithClients.length})</h3>
          {boardsWithClients.length === 0 ? (
            <div className={styles.emptyState}>
              <BoardIcon />
              <p>No boards yet</p>
              <span>Add your first board to get started</span>
            </div>
          ) : (
            boardsWithClients.map((board) => (
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
                    {board.clients.length} client{board.clients.length !== 1 ? 's' : ''}
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
                  <span className={styles.boardId}>{currentBoard.boardId}</span>
                </div>
                <Button size="sm" onClick={() => setShowAddClient(true)}>
                  <PlusIcon /> Add Client
                </Button>
              </div>

              <div className={styles.clientsSection}>
                <h4 className={styles.clientsTitle}>Assigned Clients</h4>
                {currentBoard.clients.length === 0 ? (
                  <p className={styles.noClients}>No clients assigned yet</p>
                ) : (
                  <div className={styles.clientsList}>
                    {currentBoard.clients.map(({ user, isPrimary }) => (
                      <div key={user.id} className={`${styles.clientCard} ${isPrimary ? styles.primary : ''}`}>
                        <div className={styles.clientAvatar}>
                          {user.companyLogoUrl ? (
                            <img src={user.companyLogoUrl} alt={user.companyName || user.name} />
                          ) : user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.name} />
                          ) : (
                            <span>{(user.companyName || user.name)?.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className={styles.clientInfo}>
                          <span className={styles.clientName}>
                            {user.companyName || user.name}
                            {isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                          </span>
                          <span className={styles.clientEmail}>{user.email}</span>
                        </div>
                        <div className={styles.clientActions}>
                          {!isPrimary && (
                            <button
                              className={styles.actionButton}
                              onClick={() => handleSetPrimary(currentBoard.boardId, user.id)}
                              title="Set as primary (shows logo)"
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
                            onClick={() => handleRemoveClient(currentBoard.boardId, user.id)}
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
              <Button size="sm" onClick={() => setShowAddClient(true)}>
                <PlusIcon /> Add Client
              </Button>
            </div>
          ) : (
            <div className={styles.selectPrompt}>
              <BoardIcon />
              <p>Select a board to manage its clients</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddClient && selectedBoard && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Add Client to Board</h3>
            {availableClients.length === 0 ? (
              <p className={styles.noAvailable}>All clients are already assigned to this board</p>
            ) : (
              <div className={styles.clientSelect}>
                <label className={styles.selectLabel}>Select Client</label>
                <select
                  className={styles.select}
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  <option value="">Choose a client...</option>
                  {availableClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.companyName || client.name} ({client.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => { setShowAddClient(false); setSelectedClientId(''); }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddClientToBoard}
                isLoading={isAssigning}
                disabled={!selectedClientId}
              >
                Add Client
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
