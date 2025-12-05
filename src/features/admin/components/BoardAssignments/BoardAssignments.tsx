import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useUsers } from '../../hooks/useUsers';
import { useUserBoards, useBoardAssignmentMutations } from '../../hooks/useBoardAssignments';
import type { User } from '../../domain';
import styles from './BoardAssignments.module.css';

export function BoardAssignments() {
  const { data: users, isLoading: loadingUsers } = useUsers();
  const { assignBoard, removeBoard, setPrimaryBoard, isAssigning } = useBoardAssignmentMutations();

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [boardId, setBoardId] = useState('');
  const [boardName, setBoardName] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientUsers = users?.filter((u) => u.role === 'client') || [];

  const handleAssign = async () => {
    if (!selectedUser || !boardId || !boardName) return;
    setError(null);

    try {
      await assignBoard.mutateAsync({
        userId: selectedUser.id,
        boardId,
        boardName,
        isPrimary,
      });
      setBoardId('');
      setBoardName('');
      setIsPrimary(false);
      setShowAssignForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign board');
    }
  };

  const handleRemove = async (boardId: string) => {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to remove this board assignment?')) return;

    try {
      await removeBoard.mutateAsync({ userId: selectedUser.id, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove board');
    }
  };

  const handleSetPrimary = async (boardId: string) => {
    if (!selectedUser) return;

    try {
      await setPrimaryBoard.mutateAsync({ userId: selectedUser.id, boardId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set primary board');
    }
  };

  if (loadingUsers) {
    return <Skeleton height={200} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Board Assignments</h2>
        <p className={styles.subtitle}>
          Assign Miro boards to clients. Primary board is used for redirect on login.
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.layout}>
        <div className={styles.userList}>
          <h3 className={styles.sectionTitle}>Clients</h3>
          {clientUsers.length === 0 ? (
            <p className={styles.empty}>No clients found</p>
          ) : (
            clientUsers.map((user) => (
              <button
                key={user.id}
                className={`${styles.userItem} ${selectedUser?.id === user.id ? styles.selected : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
                {user.primaryBoardId && (
                  <span className={styles.hasPrimary}>Has Primary</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className={styles.boardsPanel}>
          {selectedUser ? (
            <UserBoardsPanel
              user={selectedUser}
              onAssign={() => setShowAssignForm(true)}
              onRemove={handleRemove}
              onSetPrimary={handleSetPrimary}
            />
          ) : (
            <div className={styles.selectPrompt}>
              Select a client to manage their board assignments
            </div>
          )}
        </div>
      </div>

      {showAssignForm && selectedUser && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Assign Board to {selectedUser.name}</h3>
            <div className={styles.formFields}>
              <Input
                label="Board ID"
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                placeholder="uXjVK123abc..."
              />
              <Input
                label="Board Name"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                placeholder="Project Board"
              />
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                />
                Set as primary board (for login redirect)
              </label>
            </div>
            <div className={styles.modalActions}>
              <Button variant="ghost" onClick={() => setShowAssignForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssign} isLoading={isAssigning}>
                Assign Board
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface UserBoardsPanelProps {
  user: User;
  onAssign: () => void;
  onRemove: (boardId: string) => void;
  onSetPrimary: (boardId: string) => void;
}

function UserBoardsPanel({ user, onAssign, onRemove, onSetPrimary }: UserBoardsPanelProps) {
  const { data: boards, isLoading } = useUserBoards(user.id);

  if (isLoading) {
    return <Skeleton height={150} />;
  }

  return (
    <div className={styles.boardsPanelContent}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>{user.name}'s Boards</h3>
        <Button size="sm" onClick={onAssign}>
          Assign Board
        </Button>
      </div>

      {!boards || boards.length === 0 ? (
        <p className={styles.empty}>No boards assigned yet</p>
      ) : (
        <div className={styles.boardsList}>
          {boards.map((board) => (
            <div key={board.id} className={styles.boardItem}>
              <div className={styles.boardInfo}>
                <span className={styles.boardName}>
                  {board.boardName}
                  {board.isPrimary && <span className={styles.primaryBadge}>Primary</span>}
                </span>
                <span className={styles.boardId}>{board.boardId}</span>
              </div>
              <div className={styles.boardActions}>
                {!board.isPrimary && (
                  <Button size="sm" variant="ghost" onClick={() => onSetPrimary(board.boardId)}>
                    Set Primary
                  </Button>
                )}
                <Button size="sm" variant="danger" onClick={() => onRemove(board.boardId)}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
