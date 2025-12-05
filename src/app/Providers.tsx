import { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { queryClient } from '@shared/lib/queryClient';
import { ToastProvider } from '@shared/ui';
import { AuthProvider } from '@features/auth';
import { NotificationProvider } from '@features/notifications';
import { MiroProvider } from '@features/boards';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <MiroProvider>
          <AuthProvider>
            <NotificationProvider>
              <ToastProvider position="bottom-right">{children}</ToastProvider>
            </NotificationProvider>
          </AuthProvider>
        </MiroProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
