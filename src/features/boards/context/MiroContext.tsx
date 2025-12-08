import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { logger } from '@shared/lib/logger';

// Miro SDK v2 types
export interface MiroItem {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  content?: string;
  title?: string;
  style?: Record<string, unknown>;
}

export interface MiroFrame extends MiroItem {
  type: 'frame';
  title: string;
  childrenIds: string[];
}

export interface MiroShape extends MiroItem {
  type: 'shape';
  shape: string;
  content: string;
}

export interface MiroText extends MiroItem {
  type: 'text';
  content: string;
}

export interface MiroCard extends MiroItem {
  type: 'card';
  title: string;
  description?: string;
  dueDate?: string;
}

export interface MiroStickyNote extends MiroItem {
  type: 'sticky_note';
  content: string;
}

declare global {
  interface Window {
    miro: typeof miro;
  }
  const miro: {
    board: {
      getInfo: () => Promise<{ id: string }>;
      getIdToken: () => Promise<string>;
      getUserInfo: () => Promise<{ id: string; name: string; email?: string }>;
      ui: {
        on: (event: string, handler: () => void) => void;
        openPanel: (options: { url: string; height?: number }) => Promise<void>;
        closePanel: () => Promise<void>;
        openModal: (options: { url: string; width?: number; height?: number; fullscreen?: boolean }) => Promise<void>;
        closeModal: () => Promise<void>;
      };
      viewport: {
        get: () => Promise<{ x: number; y: number; width: number; height: number }>;
        set: (options: { x: number; y: number; width: number; height: number }) => Promise<void>;
        zoomTo: (items: MiroItem[]) => Promise<void>;
      };
      createStickyNote: (options: {
        content: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        style?: { fillColor?: string; textAlign?: string; textAlignVertical?: string };
      }) => Promise<MiroStickyNote>;
      createShape: (options: {
        content?: string;
        shape: 'rectangle' | 'circle' | 'triangle' | 'wedge_round_rectangle_callout' | 'round_rectangle' | 'rhombus';
        x: number;
        y: number;
        width: number;
        height: number;
        style?: { fillColor?: string; borderColor?: string; borderWidth?: number; fontSize?: number; color?: string; textAlign?: string; textAlignVertical?: string };
      }) => Promise<MiroShape>;
      createFrame: (options: {
        title: string;
        x: number;
        y: number;
        width: number;
        height: number;
        style?: { fillColor?: string };
      }) => Promise<MiroFrame>;
      createText: (options: {
        content: string;
        x: number;
        y: number;
        width?: number;
        rotation?: number;
        style?: { fontSize?: number; textAlign?: string; color?: string };
      }) => Promise<MiroText>;
      createCard: (options: {
        title: string;
        description?: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        dueDate?: string;
        style?: { cardTheme?: string };
      }) => Promise<MiroCard>;
      get: (options?: { type?: string | string[] }) => Promise<MiroItem[]>;
      remove: (item: { id: string }) => Promise<void>;
      sync: (item: MiroItem) => Promise<void>;
      getById: (id: string) => Promise<MiroItem | null>;
      notifications: {
        showInfo: (message: string) => Promise<void>;
        showError: (message: string) => Promise<void>;
      };
    };
    __getRuntimeState: () => { appId?: string };
  };
}

interface MiroContextValue {
  isInMiro: boolean;
  isReady: boolean;
  boardId: string | null;
  miro: typeof miro | null;
  error: string | null;
}

const MiroContext = createContext<MiroContextValue>({
  isInMiro: false,
  isReady: false,
  boardId: null,
  miro: null,
  error: null,
});

interface MiroProviderProps {
  children: ReactNode;
}

export function MiroProvider({ children }: MiroProviderProps) {
  const [isInMiro, setIsInMiro] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initMiro() {
      try {
        // Check if we're running inside Miro iframe
        const inMiro = typeof window !== 'undefined' &&
                       typeof window.miro !== 'undefined' &&
                       window.self !== window.top;

        setIsInMiro(inMiro);

        if (inMiro) {
          logger.debug('[MiroContext] Running inside Miro, initializing SDK...');

          // Get board info to verify SDK is working
          const boardInfo = await window.miro.board.getInfo();
          setBoardId(boardInfo.id);

          logger.debug('[MiroContext] Miro SDK initialized, board ID:', boardInfo.id);
          setIsReady(true);
        } else {
          logger.debug('[MiroContext] Running standalone (not in Miro iframe)');
          setIsReady(true);
        }
      } catch (err) {
        logger.error('[MiroContext] Error initializing Miro SDK:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Miro SDK');
        setIsReady(true); // Still mark as ready so app can render
      }
    }

    initMiro();
  }, []);

  const value: MiroContextValue = {
    isInMiro,
    isReady,
    boardId,
    miro: isInMiro ? window.miro : null,
    error,
  };

  return (
    <MiroContext.Provider value={value}>
      {children}
    </MiroContext.Provider>
  );
}

export function useMiro() {
  const context = useContext(MiroContext);
  if (!context) {
    throw new Error('useMiro must be used within a MiroProvider');
  }
  return context;
}

export { MiroContext };
