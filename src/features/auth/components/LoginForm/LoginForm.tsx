import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '@shared/ui';
import { useAuth } from '../../hooks/useAuth';
import { useMiro } from '@features/boards';
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
  const [miroUserId, setMiroUserId] = useState<string | null>(null);
  const [wrongBoard, setWrongBoard] = useState<WrongBoardInfo | null>(null);

  // Use ref to track if auth has been attempted (prevents infinite loop)
  const authAttempted = useRef(false);

  // Auto-authenticate when running inside Miro (only once)
  useEffect(() => {
    if (miroReady && isInMiro && !authAttempted.current) {
      authAttempted.current = true;
      handleMiroAuth();
    }
  }, [miroReady, isInMiro]);

  const handleMiroAuth = async () => {
    setIsAuthenticating(true);
    setAuthError(null);
    setAccessDenied(false);
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

      // Check if this is a "user not found" error and extract Miro ID
      if (errorMessage.includes('Your Miro ID is:')) {
        setAccessDenied(true);
        // Extract Miro ID from error message
        const match = errorMessage.match(/Your Miro ID is: (\d+)/);
        if (match && match[1]) {
          setMiroUserId(match[1]);
        }
      }

      setAuthError(errorMessage);
      setIsAuthenticating(false);
    }
  };

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
    setAuthError(null);
    setMiroUserId(null);
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
  if (isInMiro && isAuthenticating && !accessDenied) {
    return (
      <div className={styles.form}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.title}>Authenticating...</h1>
          <p className={styles.subtitle}>Please wait while we verify your Miro account</p>
        </div>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  // Show Access Restricted screen when user is not found
  if (accessDenied) {
    return (
      <div className={styles.form}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.title} style={{ color: 'var(--color-warning, #F59E0B)' }}>
            Access Restricted
          </h1>
          <p className={styles.subtitle}>
            Your account is not registered in this application.
          </p>
        </div>

        {miroUserId && (
          <div className={styles.miroIdBox} style={{
            background: 'var(--color-surface-secondary, #f5f5f5)',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Share this ID with an administrator to get access:
            </p>
            <code style={{
              display: 'block',
              padding: '8px 12px',
              background: 'var(--color-surface, #fff)',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              userSelect: 'all',
              cursor: 'pointer'
            }}>
              {miroUserId}
            </code>
          </div>
        )}

        <div className={styles.info}>
          <p className={styles.infoText}>
            Please contact an administrator and provide your Miro ID above to request access.
          </p>
        </div>

        <div className={styles.actions} style={{ marginTop: '16px' }}>
          <button
            type="button"
            className={styles.miroButton}
            onClick={handleRetry}
            style={{ opacity: 0.8 }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show Wrong Board screen when client is accessing from a different board
  if (wrongBoard) {
    return (
      <div className={styles.form}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 className={styles.title} style={{ color: 'var(--color-primary, #050038)' }}>
            Wrong Board
          </h1>
          <p className={styles.subtitle}>
            You're accessing from a different board than your assigned workspace.
          </p>
        </div>

        <div style={{
          background: 'var(--color-surface-secondary, #f5f5f5)',
          padding: '20px',
          borderRadius: '12px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            background: 'var(--color-primary, #050038)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            →
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Click below to open your assigned board:
          </p>
          <button
            type="button"
            className={styles.miroButton}
            onClick={handleGoToCorrectBoard}
            style={{
              background: 'var(--color-primary, #050038)',
              width: '100%'
            }}
          >
            <svg
              style={{ width: '20px', height: '20px', marginRight: '8px' }}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
            </svg>
            Open My Board
          </button>
        </div>

        <div className={styles.info}>
          <p className={styles.infoText}>
            Each client has a dedicated board. Please use the button above to access yours.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.form}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <Logo size="xl" />
        </div>
        <h1 className={styles.title}>Welcome</h1>
        <p className={styles.subtitle}>
          {isInMiro
            ? 'Click below to authenticate with your Miro account'
            : 'Sign in with your Miro account to continue'}
        </p>
      </div>

      {displayError && !accessDenied && <div className={styles.error}>{displayError}</div>}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.miroButton}
          onClick={isInMiro ? handleMiroAuth : handleMiroOAuth}
          disabled={isLoading || isAuthenticating}
        >
          <svg className={styles.miroIcon} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
          </svg>
          {isLoading || isAuthenticating ? 'Authenticating...' : 'Sign in with Miro'}
        </button>
      </div>

      <div className={styles.info}>
        <p className={styles.infoText}>
          Your role (Admin, Designer, or Client) is determined by your account settings.
          Contact an administrator if you need access.
        </p>
      </div>
    </div>
  );
}
