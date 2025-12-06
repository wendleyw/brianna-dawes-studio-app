import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@features/auth';
import { useMiro } from '@features/boards';
import { Skeleton } from '@shared/ui';

// Lazy load pages for code splitting
const LoginPage = lazy(() =>
  import('@features/auth').then((module) => ({ default: module.LoginPage }))
);
const DashboardPage = lazy(() =>
  import('@features/reports').then((module) => ({ default: module.DashboardPage }))
);
const ProjectsPage = lazy(() =>
  import('@features/projects').then((module) => ({ default: module.ProjectsPage }))
);
const ProjectDetailPage = lazy(() =>
  import('@features/projects').then((module) => ({ default: module.ProjectDetailPage }))
);
const NewProjectPage = lazy(() =>
  import('@features/projects').then((module) => ({ default: module.NewProjectPage }))
);
const AdminSettingsPage = lazy(() =>
  import('@features/admin').then((module) => ({ default: module.AdminSettingsPage }))
);

// Loading fallback component
function PageLoader() {
  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <Skeleton width="100%" height={200} style={{ marginBottom: 'var(--space-4)' }} />
      <Skeleton width="60%" height={24} style={{ marginBottom: 'var(--space-3)' }} />
      <Skeleton width="80%" height={16} style={{ marginBottom: 'var(--space-2)' }} />
      <Skeleton width="40%" height={16} />
    </div>
  );
}

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
  const navigate = useNavigate();
  const location = useLocation();
  const { miro, isInMiro } = useMiro();

  // Register icon:click handler to navigate to home when clicked
  useEffect(() => {
    if (!isInMiro || !miro) return;

    const handleIconClick = () => {
      // If not on home page, navigate to home
      if (location.pathname !== '/') {
        navigate('/');
      }
    };

    miro.board.ui.on('icon:click', handleIconClick);
  }, [isInMiro, miro, navigate, location.pathname]);

  return (
    <div style={routerStyles}>
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </div>
  );
}
