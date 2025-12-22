import { useEffect } from 'react';

interface UseProjectCardKeyboardProps {
  isExpanded: boolean;
  isFocused: boolean;
  onEdit: () => void;
  onArchive: () => void;
  onExpand: () => void;
  onCollapse: () => void;
  onEscape: () => void;
}

export function useProjectCardKeyboard({
  isExpanded,
  isFocused,
  onEdit,
  onArchive,
  onExpand,
  onCollapse,
  onEscape,
}: UseProjectCardKeyboardProps) {
  useEffect(() => {
    if (!isFocused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if card is focused and no modal is open
      switch (e.key) {
        case 'e':
        case 'E':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onEdit();
          }
          break;
        case 'a':
        case 'A':
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            onArchive();
          }
          break;
        case 'Enter':
          e.preventDefault();
          isExpanded ? onCollapse() : onExpand();
          break;
        case 'Escape':
          e.preventDefault();
          onEscape();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFocused, isExpanded, onEdit, onArchive, onExpand, onCollapse, onEscape]);
}
