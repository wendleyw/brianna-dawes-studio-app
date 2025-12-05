import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMiro } from '@features/boards';
import { Skeleton, Logo } from '@shared/ui';
import type { ProtectedRouteProps } from '../domain/auth.types';
import { AccessDenied } from '../components/AccessDenied';

/**
 * Component shown when client has no board assigned
 */
function PendingBoardAssignment({ miroUserId }: { miroUserId: string | null }) {
  const { logout } = useAuth();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: '24px',
      background: '#fafafa'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size="xl" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#2563EB',
            marginBottom: '8px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Setup in Progress
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0
          }}>
            Your account has been registered successfully!
          </p>
        </div>

        <div style={{
          background: '#EFF6FF',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'center',
          border: '1px solid #BFDBFE'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            background: '#2563EB',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            ⏳
          </div>
          <p style={{ fontSize: '14px', color: '#1E40AF', margin: '0 0 8px 0', fontWeight: 500 }}>
            Waiting for Board Assignment
          </p>
          <p style={{ fontSize: '13px', color: '#3B82F6', margin: 0 }}>
            An administrator needs to assign a workspace to your account before you can access the application.
          </p>
        </div>

        {miroUserId && (
          <div style={{
            background: '#f5f5f5',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '11px', color: '#888888', margin: '0 0 4px 0' }}>
              Your Miro ID (for reference):
            </p>
            <code style={{
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#050038'
            }}>
              {miroUserId}
            </code>
          </div>
        )}

        <div style={{
          padding: '16px',
          background: '#f9f9f9',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#888888',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.5
          }}>
            Please contact the administrator if you believe this is taking too long.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: '#050038',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            marginBottom: '12px'
          }}
        >
          Check Again
        </button>

        <button
          type="button"
          onClick={logout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            backgroundColor: 'transparent',
            color: '#666666',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

/**
 * Component shown when client is on the wrong board
 */
function WrongBoardAccess({ correctBoardId }: { correctBoardId: string }) {
  const correctBoardUrl = `https://miro.com/app/board/${correctBoardId}/`;

  const handleGoToCorrectBoard = () => {
    window.open(correctBoardUrl, '_blank');
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      padding: '24px',
      background: '#fafafa'
    }}>
      <div style={{
        maxWidth: '400px',
        width: '100%',
        background: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <Logo size="xl" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#F59E0B',
            marginBottom: '8px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Wrong Board
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0
          }}>
            You're accessing from a different board than your assigned workspace.
          </p>
        </div>

        <div style={{
          background: '#FEF3C7',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '20px',
          textAlign: 'center',
          border: '1px solid #FCD34D'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            background: '#F59E0B',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            →
          </div>
          <p style={{ fontSize: '14px', color: '#92400E', margin: '0 0 16px 0', fontWeight: 500 }}>
            Click below to open your assigned board:
          </p>
          <button
            type="button"
            onClick={handleGoToCorrectBoard}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              backgroundColor: '#F59E0B',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
            </svg>
            Open My Board
          </button>
        </div>

        <div style={{
          padding: '16px',
          background: '#f9f9f9',
          borderRadius: '8px'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#888888',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.5
          }}>
            Each client has a dedicated board. Please use the button above to access yours.
          </p>
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { boardId: currentBoardId, isReady: miroReady } = useMiro();
  const location = useLocation();

  if (isLoading || !miroReady) {
    return (
      <div style={{ padding: 'var(--space-8)' }}>
        <Skeleton width="100%" height={400} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // For clients, verify they have a board assignment
  if (user.role === 'client' && !user.primaryBoardId) {
    return <PendingBoardAssignment miroUserId={user.miroUserId} />;
  }

  // For clients, verify they are on their assigned board
  if (user.role === 'client' && user.primaryBoardId && currentBoardId) {
    if (currentBoardId !== user.primaryBoardId) {
      return <WrongBoardAccess correctBoardId={user.primaryBoardId} />;
    }
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
