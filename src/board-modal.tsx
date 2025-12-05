/**
 * Board Modal Entry Point
 * This is the entry point for the Trello-style project board modal
 * that opens in the Miro canvas area (not the panel)
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MiroProvider } from '@features/boards';
import { AuthProvider } from '@features/auth';
import { BoardModalApp } from './app/BoardModalApp';
import '@shared/ui/styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

function renderApp() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <MiroProvider>
            <AuthProvider>
              <BoardModalApp />
            </AuthProvider>
          </MiroProvider>
        </QueryClientProvider>
      </StrictMode>
    );
  }
}

renderApp();
