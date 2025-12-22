import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@shared/ui';
import { useAuth } from '../../hooks/useAuth';
import { useMiro } from '@features/boards/context/MiroContext';
import type { LoginFormProps } from './LoginForm.types';
import styles from './LoginForm.module.css';

interface WrongBoardInfo {
  correctBoardId: string;
  correctBoardUrl: string;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate();
  const { authenticateFromMiro, loginWithMiro, isLoading, error } = useAuth();
  const { isInMiro, isReady: miroReady, boardId: currentBoardId } = useMiro();

  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [pendingBoardAssignment, setPendingBoardAssignment] = useState(false);
  const [wrongBoard, setWrongBoard] = useState<WrongBoardInfo | null>(null);

  // Use ref to track if auth has been attempted (prevents infinite loop)
  const authAttempted = useRef(false);

  const handleMiroAuth = useCallback(async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAccessDenied(false);
    setPendingBoardAssignment(false);
    setWrongBoard(null);

    try {
      const { redirectTo } = await authenticateFromMiro();

      // After successful auth, check if client is on the wrong board
      // We need to get the user from the auth context after authentication
      // The redirectTo will contain the correct board path for clients
      const boardIdMatch = redirectTo.match(/\/board\/([^/]+)/);
      const userPrimaryBoardId = boardIdMatch ? boardIdMatch[1] : null;

      // If user is a client with a primary board and current board doesn't match
      if (userPrimaryBoardId && currentBoardId && userPrimaryBoardId !== currentBoardId) {
        setWrongBoard({
          correctBoardId: userPrimaryBoardId,
          correctBoardUrl: `https://miro.com/app/board/${userPrimaryBoardId}/`,
        });
        setIsAuthenticating(false);
        return;
      }

      onSuccess?.();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed. Please try again.';

      // Check if this is a "pending board assignment" error
      if (errorMessage.startsWith('PENDING_BOARD_ASSIGNMENT:')) {
        setPendingBoardAssignment(true);
        setIsAuthenticating(false);
        return;
      }

      // Check if this is a "user not found" error
      if (errorMessage.includes('User not found')) {
        setAccessDenied(true);
      }

      setAuthError(errorMessage);
      setIsAuthenticating(false);
    }
  }, [authenticateFromMiro, currentBoardId, navigate, onSuccess]);

  // Auto-authenticate when running inside Miro (only once)
  useEffect(() => {
    if (miroReady && isInMiro && !authAttempted.current) {
      authAttempted.current = true;
      handleMiroAuth();
    }
  }, [miroReady, isInMiro, handleMiroAuth]);

  const handleMiroOAuth = async () => {
    try {
      const authUrl = await loginWithMiro();
      window.location.href = authUrl;
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Failed to start Miro authentication.'
      );
    }
  };

  const handleRetry = () => {
    authAttempted.current = false;
    setAccessDenied(false);
    setPendingBoardAssignment(false);
    setAuthError(null);
    setWrongBoard(null);
    handleMiroAuth();
  };

  const handleGoToCorrectBoard = () => {
    if (wrongBoard) {
      window.open(wrongBoard.correctBoardUrl, '_blank');
    }
  };

  const displayError = authError || (error?.message);

  // Show loading state when auto-authenticating in Miro
  if (isInMiro && isAuthenticating && !accessDenied && !pendingBoardAssignment) {
    return (
      <div className={`${styles.form} ${styles.formPadding}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.screenTitlePrimary}>Authenticating...</h1>
          <p className={styles.screenSubtitle}>Please wait while we verify your Miro account</p>
        </div>
        <div className={styles.spinner} />
      </div>
    );
  }

  // Show Access Restricted screen when user is not found
  if (accessDenied) {
    return (
      <div className={`${styles.form} ${styles.formPadding}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.screenTitleWarning}>Access Restricted</h1>
          <p className={styles.screenSubtitle}>
            Your account is not registered in this application.
          </p>
        </div>

        <div className={styles.helpBox}>
          <p className={styles.helpText}>
            Please contact an administrator to set up your account.
          </p>
        </div>

        <div className={styles.actionsContainer}>
          <button type="button" onClick={handleRetry} className={styles.buttonSecondary}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show Pending Board Assignment screen when user is registered but has no board
  if (pendingBoardAssignment) {
    return (
      <div className={`${styles.form} ${styles.formPadding}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.screenTitleBlue}>Setup in Progress</h1>
          <p className={styles.screenSubtitle}>
            Your account has been registered successfully!
          </p>
        </div>

        <div className={styles.infoBoxBlue}>
          <div className={styles.iconCircleBlue}>⏳</div>
          <p className={styles.infoBoxBlueTitle}>Waiting for Board Assignment</p>
          <p className={styles.infoBoxBlueText}>
            An administrator needs to assign a workspace to your account before you can access the application.
          </p>
        </div>


        <div className={styles.helpBox}>
          <p className={styles.helpText}>
            Please contact the administrator if you believe this is taking too long.
          </p>
        </div>

        <div className={styles.actionsContainer}>
          <button type="button" onClick={handleRetry} className={styles.buttonSecondary}>
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // Show Wrong Board screen when client is accessing from a different board
  if (wrongBoard) {
    return (
      <div className={`${styles.form} ${styles.formPadding}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.screenTitlePrimary}>Wrong Board</h1>
          <p className={styles.screenSubtitle}>
            You're accessing from a different board than your assigned workspace.
          </p>
        </div>

        <div className={styles.infoBoxNeutral}>
          <div className={styles.iconCircleNeutral}>→</div>
          <p className={styles.infoBoxNeutralText}>Click below to open your assigned board:</p>
          <button type="button" onClick={handleGoToCorrectBoard} className={styles.buttonPrimary}>
            <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
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
    );
  }

  return (
    <div className={`${styles.form} ${styles.formPadding}`}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <Logo size="xl" />
        </div>
        <h1 className={styles.screenTitlePrimary}>Welcome</h1>
        <p className={styles.screenSubtitle}>
          {isInMiro
            ? 'Click below to authenticate with your Miro account'
            : 'Sign in with your Miro account to continue'}
        </p>
      </div>

      {displayError && !accessDenied && (
        <div className={styles.errorAlert}>{displayError}</div>
      )}

      <div className={styles.actionsContainer}>
        <button
          type="button"
          onClick={isInMiro ? handleMiroAuth : handleMiroOAuth}
          disabled={isLoading || isAuthenticating}
          className={styles.buttonPrimary}
        >
          <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
          </svg>
          {isLoading || isAuthenticating ? 'Authenticating...' : 'Sign in with Miro'}
        </button>
      </div>

      <div className={styles.helpBox}>
        <p className={styles.helpText}>
          Your role (Admin, Designer, or Client) is determined by your account settings.
          Contact an administrator if you need access.
        </p>
      </div>
    </div>
  );
}
