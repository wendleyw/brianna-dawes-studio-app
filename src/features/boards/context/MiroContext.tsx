/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@shared/lib/supabase';
// Logger removed - using console.log for debug visibility in Miro panel

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
    async function initMiro() {
      console.log('[MiroContext] Starting initialization...');
      try {
        // Check if we're running inside Miro iframe
        const hasMiroSDK = typeof window !== 'undefined' && typeof window.miro !== 'undefined';
        const isInIframe = typeof window !== 'undefined' && window.self !== window.top;
        const inMiro = hasMiroSDK && isInIframe;

        console.log('[MiroContext] Detection:', { hasMiroSDK, isInIframe, inMiro });
        setIsInMiro(inMiro);

        if (inMiro) {
          console.log('[MiroContext] Running inside Miro, initializing SDK...');

          // Get board info to verify SDK is working
          const boardInfo = await window.miro.board.getInfo();
          setBoardId(boardInfo.id);

          console.log('[MiroContext] Miro SDK initialized, board ID:', boardInfo.id);

          // Test raw fetch connectivity first (without Supabase client)
          console.log('[MiroContext] Testing raw fetch to Supabase...');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

          const rawFetchStart = Date.now();
          try {
            const rawResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id&limit=1`, {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
              }
            });
            const rawElapsed = Date.now() - rawFetchStart;
            console.log('[MiroContext] Raw fetch completed in', rawElapsed, 'ms, status:', rawResponse.status);
          } catch (rawErr) {
            const rawElapsed = Date.now() - rawFetchStart;
            console.error('[MiroContext] Raw fetch FAILED after', rawElapsed, 'ms:', rawErr);
          }

          // Mark as ready IMMEDIATELY - don't wait for Supabase client test
          // The raw fetch already confirmed connectivity
          console.log('[MiroContext] Setting isReady=true (raw fetch confirmed connectivity)');
          setIsReady(true);

          // Test Supabase client connectivity in background (non-blocking)
          console.log('[MiroContext] Testing Supabase client connectivity (background)...');
          const connectivityStart = Date.now();

          // Add timeout to prevent hanging
          const testPromise = supabase
            .from('users')
            .select('id')
            .limit(1)
            .maybeSingle();

          const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: { message: 'Test timeout after 5s' } }), 5000)
          );

          Promise.race([testPromise, timeoutPromise]).then(({ data, error: testError }) => {
            const elapsed = Date.now() - connectivityStart;
            if (testError) {
              console.warn('[MiroContext] Supabase client test:', testError.message, 'in', elapsed, 'ms');
            } else {
              console.log('[MiroContext] Supabase client OK in', elapsed, 'ms, test data:', !!data);
            }
          }).catch((connErr) => {
            const elapsed = Date.now() - connectivityStart;
            console.error('[MiroContext] Supabase client FAILED after', elapsed, 'ms:', connErr);
          });
        } else {
          console.log('[MiroContext] Running standalone (not in Miro iframe)');
          setIsReady(true);
        }
      } catch (err) {
        console.error('[MiroContext] Error initializing Miro SDK:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Miro SDK');
        setIsReady(true); // Still mark as ready so app can render
      }
    }

    initMiro();
  }, []);

  // Listen for card selection changes to detect project card clicks
  useEffect(() => {
    if (!isInMiro || !isReady) return;

    let lastClickTime = 0;
    let lastClickedProjectId: string | null = null;

    const handleSelectionUpdate = async (event?: { items?: Array<{ id: string; type: string; description?: string }> }) => {
      console.log('[MiroContext] Selection update:', event);

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

      console.log('[MiroContext] Project card selected:', { projectId, isDoubleClick });
      setSelectedProjectId(projectId);

      if (isDoubleClick) {
        // Double click: Open project modal
        console.log('[MiroContext] Double click detected, opening project modal');
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
        console.log('[MiroContext] Single click, zooming to project');
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

    console.log('[MiroContext] Registering selection:update listener');
    window.miro.board.ui.on('selection:update', handleSelectionUpdate);

    return () => {
      console.log('[MiroContext] Removing selection:update listener');
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
