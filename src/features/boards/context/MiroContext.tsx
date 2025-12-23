/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@shared/lib/supabase';

const debugEnabled = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';
const debugLog = (...args: unknown[]) => {
  if (debugEnabled) {
    console.log(...args);
  }
};
const debugWarn = (...args: unknown[]) => {
  if (debugEnabled) {
    console.warn(...args);
  }
};

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
        on: (event: string, handler: (event?: { items?: Array<{ id: string; type: string; description?: string }> }) => void) => void;
        off: (event: string, handler: (event?: { items?: Array<{ id: string; type: string; description?: string }> }) => void) => void;
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
  selectedProjectId: string | null;
}

const MiroContext = createContext<MiroContextValue>({
  isInMiro: false,
  isReady: false,
  boardId: null,
  miro: null,
  error: null,
  selectedProjectId: null,
});

interface MiroProviderProps {
  children: ReactNode;
}

export function MiroProvider({ children }: MiroProviderProps) {
  const [isInMiro, setIsInMiro] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function runConnectivityChecks() {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        debugWarn('[MiroContext] Supabase env vars missing, skipping connectivity checks');
        return;
      }

      debugLog('[MiroContext] Testing raw fetch to Supabase...');
      const rawFetchStart = Date.now();
      try {
        const rawResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
          },
        });
        const rawElapsed = Date.now() - rawFetchStart;
        debugLog('[MiroContext] Raw fetch completed in', rawElapsed, 'ms, status:', rawResponse.status);
      } catch (rawErr) {
        const rawElapsed = Date.now() - rawFetchStart;
        debugWarn('[MiroContext] Raw fetch FAILED after', rawElapsed, 'ms:', rawErr);
      }

      debugLog('[MiroContext] Testing Supabase client connectivity (background)...');
      const connectivityStart = Date.now();

      const testPromise = supabase
        .from('users')
        .select('id')
        .limit(1)
        .maybeSingle();

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'Test timeout after 5s' } }), 5000)
      );

      Promise.race([testPromise, timeoutPromise])
        .then(({ data, error: testError }) => {
          const elapsed = Date.now() - connectivityStart;
          if (testError) {
            debugWarn('[MiroContext] Supabase client test:', testError.message, 'in', elapsed, 'ms');
          } else {
            debugLog('[MiroContext] Supabase client OK in', elapsed, 'ms, test data:', !!data);
          }
        })
        .catch((connErr) => {
          const elapsed = Date.now() - connectivityStart;
          debugWarn('[MiroContext] Supabase client FAILED after', elapsed, 'ms:', connErr);
        });
    }

    async function initMiro() {
      debugLog('[MiroContext] Starting initialization...');
      try {
        // Check if we're running inside Miro iframe
        const hasMiroSDK = typeof window !== 'undefined' && typeof window.miro !== 'undefined';
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        const inMiro = hasMiroSDK && isInIframe;

        debugLog('[MiroContext] Detection:', { hasMiroSDK, isInIframe, inMiro });
        if (isActive) setIsInMiro(inMiro);

        if (inMiro) {
          debugLog('[MiroContext] Running inside Miro, initializing SDK...');
          if (isActive) setIsReady(true);

          try {
            const boardInfo = await window.miro.board.getInfo();
            if (isActive) setBoardId(boardInfo.id);
            debugLog('[MiroContext] Miro SDK initialized, board ID:', boardInfo.id);
          } catch (boardErr) {
            console.error('[MiroContext] Failed to get board info:', boardErr);
            if (isActive) {
              setError(boardErr instanceof Error ? boardErr.message : 'Failed to get board info');
            }
          }

          if (debugEnabled) {
            void runConnectivityChecks();
          }
        } else {
          debugLog('[MiroContext] Running standalone (not in Miro iframe)');
          if (isActive) setIsReady(true);
        }
      } catch (err) {
        console.error('[MiroContext] Error initializing Miro SDK:', err);
        if (isActive) {
          setError(err instanceof Error ? err.message : 'Failed to initialize Miro SDK');
          setIsReady(true); // Still mark as ready so app can render
        }
      }
    }

    initMiro();

    return () => {
      isActive = false;
    };
  }, []);

  // Listen for card selection changes to detect project card clicks
  useEffect(() => {
    if (!isInMiro || !isReady) return;

    let lastClickTime = 0;
    let lastClickedProjectId: string | null = null;

    const handleSelectionUpdate = async (event?: { items?: Array<{ id: string; type: string; description?: string }> }) => {
      debugLog('[MiroContext] Selection update:', event);

      if (!event?.items?.length) {
        setSelectedProjectId(null);
        return;
      }

      // Check if a card with projectId in description is selected
      const selectedCard = event.items.find(item =>
        item.type === 'card' && item.description?.includes('projectId:')
      );

      if (!selectedCard) {
        setSelectedProjectId(null);
        return;
      }

      // Extract projectId from description
      const match = selectedCard.description?.match(/projectId:([a-f0-9-]+)/);
      const projectId = match?.[1] || null;

      if (!projectId) {
        setSelectedProjectId(null);
        return;
      }

      const now = Date.now();
      const isDoubleClick = lastClickedProjectId === projectId && (now - lastClickTime) < 500;

      debugLog('[MiroContext] Project card selected:', { projectId, isDoubleClick });
      setSelectedProjectId(projectId);

      if (isDoubleClick) {
        // Double click: Open project modal
        debugLog('[MiroContext] Double click detected, opening project modal');
        try {
          await window.miro.board.ui.openModal({
            url: `board-modal.html?mode=project&projectId=${projectId}`,
            width: 800,
            height: 600,
          });
        } catch (err) {
        console.error('[MiroContext] Error opening project modal:', err);
        }
      } else {
        // Single click: Zoom to project briefing frame
        debugLog('[MiroContext] Single click, zooming to project');
        // Import dynamically to avoid circular dependencies
        import('../services/miroSdkService').then(({ zoomToProject }) => {
          zoomToProject(projectId);
        }).catch(err => {
          console.error('[MiroContext] Error zooming to project:', err);
        });
      }

      lastClickTime = now;
      lastClickedProjectId = projectId;
    };

    debugLog('[MiroContext] Registering selection:update listener');
    window.miro.board.ui.on('selection:update', handleSelectionUpdate);

    return () => {
      debugLog('[MiroContext] Removing selection:update listener');
      window.miro.board.ui.off('selection:update', handleSelectionUpdate);
    };
  }, [isInMiro, isReady]);

  const value: MiroContextValue = {
    isInMiro,
    isReady,
    boardId,
    miro: isInMiro ? window.miro : null,
    error,
    selectedProjectId,
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
