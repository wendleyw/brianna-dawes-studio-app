import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Skeleton } from '@shared/ui';
import type { ProtectedRouteProps } from '../domain/auth.types';
import { AccessDenied } from '../components/AccessDenied';

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <Skeleton width="100%" height={400} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <AccessDenied userRole={user.role} requiredRoles={allowedRoles} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', flex: 1, overflow: 'hidden' }}>
      {children}
    </div>
  );
}
