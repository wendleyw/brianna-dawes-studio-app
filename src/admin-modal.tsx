/**
 * Admin Modal Entry Point
 * This is the entry point for the Admin Dashboard modal
 * that opens when clicking the Admin button in the Dashboard
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@shared/lib/queryClient';
import { MiroProvider } from '@features/boards';
import { AuthProvider } from '@features/auth';
import { ToastProvider } from '@shared/ui';
import { ErrorBoundary } from '@shared/components';
import { AdminDashboardPage } from '@features/admin';
import '@shared/ui/styles/global.css';

function getSearchParam(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

async function waitForMiro(timeout = 3000): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof window.miro !== 'undefined') return true;

  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (typeof window.miro !== 'undefined') {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

export function AdminModalApp() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <MiroProvider>
            <AuthProvider>
              <ToastProvider position="bottom-right">
                <AdminDashboardPage />
              </ToastProvider>
            </AuthProvider>
          </MiroProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

function renderApp() {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <AdminModalApp />
      </StrictMode>
    );
  }
}

async function init() {
  const mode = getSearchParam('mode');
  const tab = getSearchParam('tab') || 'overview';

  if (mode !== 'modal') {
    const miroReady = await waitForMiro();
    if (miroReady && typeof window !== 'undefined' && window.miro) {
      try {
        await window.miro.board.ui.openPanel({
          url: `app.html?adminTab=${encodeURIComponent(tab)}`,
          height: 760,
        });
        await window.miro.board.ui.closeModal();
        return;
      } catch (error) {
        console.error('Failed to redirect admin modal to panel', error);
      }
    }
  }

  renderApp();
}

init();
