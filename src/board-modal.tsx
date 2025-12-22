/**
 * Board Modal Entry Point
 * This is the entry point for modals that open in the Miro canvas area (not the panel)
 *
 * Supports two modes:
 * - Default: Trello-style project board (BoardModalApp)
 * - mode=project&projectId=XXX: Project edit modal (ProjectEditModal)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MiroProvider } from '@features/boards';
import { AuthProvider } from '@features/auth';
import { BoardModalApp } from './app/BoardModalApp';
import { ProjectEditModal } from './app/ProjectEditModal';
import '@shared/ui/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Parse URL parameters to determine which modal to show
function getModalMode(): { mode: string; projectId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode') || 'board';
  const projectId = params.get('projectId');
  return { mode, projectId };
}

export function ModalRouter() {
  const { mode, projectId } = getModalMode();

  if (mode === 'project' && projectId) {
    return <ProjectEditModal projectId={projectId} />;
  }

  // Default: Show the kanban board
  return <BoardModalApp />;
}

function renderApp() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MiroProvider>
            <AuthProvider>
              <ModalRouter />
            </AuthProvider>
          </MiroProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  }
}

renderApp();
