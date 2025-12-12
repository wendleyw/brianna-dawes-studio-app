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

function AdminModalApp() {
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

renderApp();
