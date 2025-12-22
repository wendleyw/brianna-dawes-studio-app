import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ProtectedRoute } from '@features/auth';
import { useMiro } from '@features/boards';
import { Skeleton } from '@shared/ui';
import { AppShell } from './AppShell';
import styles from './Router.module.css';

// Lazy load pages for code splitting
const LoginPage = lazy(() =>
  import('@features/auth').then((module) => ({ default: module.LoginPage }))
);
const MiroOAuthCallbackPage = lazy(() =>
  import('@features/auth').then((module) => ({ default: module.MiroOAuthCallbackPage }))
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
const EditProjectPage = lazy(() =>
  import('@features/projects').then((module) => ({ default: module.EditProjectPage }))
);
const AdminDashboardPage = lazy(() =>
  import('@features/admin').then((module) => ({ default: module.AdminDashboardPage }))
);
const NotificationsPage = lazy(() =>
  import('@features/notifications').then((module) => ({ default: module.NotificationsPage }))
);

// Loading fallback component
function PageLoader() {
  return (
    <div className={styles.pageLoader}>
      <Skeleton width="100%" height={200} className={styles.pageLoaderSkeleton1} />
      <Skeleton width="60%" height={24} className={styles.pageLoaderSkeleton2} />
      <Skeleton width="80%" height={16} className={styles.pageLoaderSkeleton3} />
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
    <div className={styles.boardRedirect}>
      <p>Redirecting to your board...</p>
    </div>
  );
}

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
    <div className={styles.routerContainer}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/miro/oauth/callback" element={<MiroOAuthCallbackPage />} />

          {/* Protected layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="dashboard" element={<DashboardPage />} />

            {/* Projects */}
            <Route path="projects" element={<ProjectsPage />} />
            <Route
              path="projects/new"
              element={
                <ProtectedRoute allowedRoles={['admin', 'client']}>
                  <NewProjectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="projects/:id/edit"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <EditProjectPage />
                </ProtectedRoute>
              }
            />
            <Route path="projects/:id" element={<ProjectDetailPage />} />

            {/* Board redirect - for clients */}
            <Route path="board/:boardId" element={<BoardPage />} />

            {/* Notifications */}
            <Route path="notifications" element={<NotificationsPage />} />

            {/* Admin */}
            <Route
              path="admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Navigate to="/admin?tab=analytics" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/settings"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Navigate to="/admin?tab=settings" replace />
                </ProtectedRoute>
              }
            />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  );
}
