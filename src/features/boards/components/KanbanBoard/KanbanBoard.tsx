import { useState, DragEvent } from 'react';
import { Skeleton } from '@shared/ui';
import type { KanbanBoardProps } from './KanbanBoard.types';
import type { KanbanCard, KanbanColumnId } from '../../domain/board.types';
import styles from './KanbanBoard.module.css';

const PRIORITY_CLASS: Record<string, string | undefined> = {
  low: styles.priorityLow,
  medium: styles.priorityMedium,
  high: styles.priorityHigh,
  urgent: styles.priorityUrgent,
};

export function KanbanBoard({
  state,
  onCardMove,
  onCardClick,
  isLoading = false,
}: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<KanbanCard | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanColumnId | null>(null);

  const handleDragStart = (e: DragEvent, card: KanbanCard) => {
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedCard(null);
    setDropTarget(null);
  };

  const handleDragOver = (e: DragEvent, columnId: KanbanColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTarget(columnId);
  };

  const handleDragLeave = () => {
    setDropTarget(null);
  };

  const handleDrop = (e: DragEvent, columnId: KanbanColumnId) => {
    e.preventDefault();
    if (draggedCard && draggedCard.columnId !== columnId) {
      const cardsInColumn = state.cards.filter((c) => c.columnId === columnId);
      onCardMove?.(draggedCard.id, columnId, cardsInColumn.length);
    }
    setDraggedCard(null);
    setDropTarget(null);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
    });
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.column}>
            <div className={styles.columnHeader}>
              <Skeleton width={100} height={20} />
            </div>
            <div className={styles.columnContent}>
              <Skeleton height={80} />
              <Skeleton height={80} />
              <Skeleton height={80} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className={styles.container}>
        {state.columns.map((column) => {
          const columnCards = state.cards
            .filter((c) => c.columnId === column.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={column.id} className={styles.column}>
              <div
                className={styles.columnHeader}
                style={{ '--column-color': column.color } as React.CSSProperties}
              >
                <h3 className={styles.columnTitle}>{column.title}</h3>
                <span className={styles.columnCount}>{columnCards.length}</span>
              </div>

              <div
                className={`${styles.columnContent} ${
                  dropTarget === column.id ? styles.dropZoneActive : ''
                }`}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {columnCards.length === 0 ? (
                  <div className={styles.empty}>
                    No items
                  </div>
                ) : (
                  columnCards.map((card) => (
                    <div
                      key={card.id}
                      className={`${styles.card} ${
                        draggedCard?.id === card.id ? styles.cardDragging : ''
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, card)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onCardClick?.(card)}
                    >
                      <div className={styles.cardHeader}>
                        <h4 className={styles.cardTitle}>{card.name}</h4>
                        <span
                          className={`${styles.cardPriority} ${
                            PRIORITY_CLASS[card.priority] || styles.priorityMedium
                          }`}
                          title={`Priority: ${card.priority}`}
                        />
                      </div>

                      {card.dueDate && (
                        <div className={styles.cardMeta}>
                          <span
                            className={`${styles.cardDate} ${
                              isOverdue(card.dueDate) ? styles.cardDateOverdue : ''
                            }`}
                          >
                            <svg
                              className={styles.cardDateIcon}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            {formatDate(card.dueDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {state.lastSyncAt && (
        <div className={styles.lastSync}>
          Last sync: {new Date(state.lastSyncAt).toLocaleString('en-US')}
        </div>
      )}
    </>
  );
}
