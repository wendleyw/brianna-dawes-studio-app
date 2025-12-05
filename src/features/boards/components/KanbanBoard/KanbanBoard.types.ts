import type { KanbanBoardState, KanbanCard, KanbanColumnId } from '../../domain/board.types';

export interface KanbanBoardProps {
  state: KanbanBoardState;
  onCardMove?: (cardId: string, targetColumnId: KanbanColumnId, position: number) => void;
  onCardClick?: (card: KanbanCard) => void;
  isLoading?: boolean;
}
