import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useMiro } from '@features/boards';
import { Skeleton, Logo } from '@shared/ui';
import type { ProtectedRouteProps } from '../domain/auth.types';
import { AccessDenied } from '../components/AccessDenied';
import styles from './ProtectedRoute.module.css';

/**
 * Component shown when client has no board assigned
 */
function PendingBoardAssignment({ miroUserId }: { miroUserId: string | null }) {
  const { logout } = useAuth();

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.titleBlue}>Setup in Progress</h1>
          <p className={styles.subtitle}>Your account has been registered successfully!</p>
        </div>

        <div className={styles.infoBoxBlue}>
          <div className={styles.iconCircleBlue}>
            <span role="img" aria-label="hourglass">
              &#9203;
            </span>
          </div>
          <p className={styles.infoTitleBlue}>Waiting for Board Assignment</p>
          <p className={styles.infoTextBlue}>
            An administrator needs to assign a workspace to your account before you can access the
            application.
          </p>
        </div>

        {miroUserId && (
          <div className={styles.miroIdBox}>
            <p className={styles.miroIdLabel}>Your Miro ID (for reference):</p>
            <code className={styles.miroIdValue}>{miroUserId}</code>
          </div>
        )}

        <div className={styles.helpBox}>
          <p className={styles.helpText}>
            Please contact the administrator if you believe this is taking too long.
          </p>
        </div>

        <button type="button" onClick={() => window.location.reload()} className={styles.buttonPrimary}>
          Check Again
        </button>

        <button type="button" onClick={logout} className={styles.buttonSecondary}>
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
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.titleWarning}>Wrong Board</h1>
          <p className={styles.subtitle}>
            You're accessing from a different board than your assigned workspace.
          </p>
        </div>

        <div className={styles.infoBoxWarning}>
          <div className={styles.iconCircleWarning}>
            <span role="img" aria-label="arrow">
              &#8594;
            </span>
          </div>
          <p className={styles.infoTitleWarning} style={{ marginBottom: '16px' }}>
            Click below to open your assigned board:
          </p>
          <button type="button" onClick={handleGoToCorrectBoard} className={styles.buttonWarning}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
            </svg>
            Open My Board
          </button>
        </div>

        <div className={styles.helpBox}>
          <p className={styles.helpText}>
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
      <div className={styles.loadingWrapper}>
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

  return <div className={styles.routeWrapper}>{children}</div>;
}
