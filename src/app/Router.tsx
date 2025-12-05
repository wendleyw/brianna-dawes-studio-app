import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage, ProtectedRoute } from '@features/auth';
import { ProjectsPage, ProjectDetailPage, NewProjectPage } from '@features/projects';
import { DashboardPage } from '@features/reports';
import { AdminSettingsPage } from '@features/admin';

// Board redirect page - opens Miro board
function BoardPage() {
  const boardId = window.location.pathname.split('/board/')[1];

  if (boardId) {
    // Redirect to Miro board
    window.location.href = `https://miro.com/app/board/${boardId}`;
  }

  return (
    <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
      <p>Redirecting to your board...</p>
    </div>
  );
}

const routerStyles: React.CSSProperties = {
  width: '100%',
  height: '100%',
  flex: 1,
  overflow: 'hidden',
};

export function Router() {
  return (
    <div style={routerStyles}>
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Projects */}
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <ProjectsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <ProtectedRoute allowedRoles={['admin', 'client']}>
            <NewProjectPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <ProjectDetailPage />
          </ProtectedRoute>
        }
      />

      {/* Board redirect - for clients */}
      <Route
        path="/board/:boardId"
        element={
          <ProtectedRoute>
            <BoardPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Settings - Admin only */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </div>
  );
}
