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
  const [pendingBoardAssignment, setPendingBoardAssignment] = useState(false);
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
        // Extract Miro ID from error message (format: PENDING_BOARD_ASSIGNMENT:miroId:message)
        const parts = errorMessage.split(':');
        if (parts[1]) {
          setMiroUserId(parts[1]);
        }
        setIsAuthenticating(false);
        return;
      }

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
    setPendingBoardAssignment(false);
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
  if (isInMiro && isAuthenticating && !accessDenied && !pendingBoardAssignment) {
    return (
      <div className={styles.form} style={{ padding: '24px' }}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#050038',
            marginBottom: '8px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>Authenticating...</h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0
          }}>Please wait while we verify your Miro account</p>
        </div>
        <div style={{
          width: '40px',
          height: '40px',
          margin: '24px auto',
          border: '3px solid #e0e0e0',
          borderTopColor: '#2563EB',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      </div>
    );
  }

  // Show Access Restricted screen when user is not found
  if (accessDenied) {
    return (
      <div className={styles.form} style={{ padding: '24px' }}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#F59E0B',
            marginBottom: '8px',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}>
            Access Restricted
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            margin: 0
          }}>
            Your account is not registered in this application.
          </p>
        </div>

        {miroUserId && (
          <div style={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '8px',
            marginTop: '20px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '12px', color: '#666666', marginBottom: '8px', margin: '0 0 8px 0' }}>
              Share this ID with an administrator to get access:
            </p>
            <code style={{
              display: 'block',
              padding: '12px 16px',
              background: '#ffffff',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: 'monospace',
              userSelect: 'all',
              cursor: 'pointer',
              color: '#050038',
              fontWeight: 600,
              border: '1px solid #e0e0e0'
            }}>
              {miroUserId}
            </code>
          </div>
        )}

        <div style={{
          marginTop: '16px',
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
            Please contact an administrator and provide your Miro ID above to request access.
          </p>
        </div>

        <div style={{ marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleRetry}
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
              opacity: 0.8
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show Pending Board Assignment screen when user is registered but has no board
  if (pendingBoardAssignment) {
    return (
      <div className={styles.form} style={{ padding: '24px' }}>
        <div className={styles.header}>
          <div className={styles.logo}>
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
          marginTop: '20px',
          marginBottom: '16px',
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
            marginBottom: '16px',
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
          borderRadius: '8px'
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

        <div style={{ marginTop: '20px' }}>
          <button
            type="button"
            onClick={handleRetry}
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
              opacity: 0.8
            }}
          >
            Check Again
          </button>
        </div>
      </div>
    );
  }

  // Show Wrong Board screen when client is accessing from a different board
  if (wrongBoard) {
    return (
      <div className={styles.form} style={{ padding: '24px' }}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Logo size="xl" />
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            color: '#050038',
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
          background: '#f5f5f5',
          padding: '20px',
          borderRadius: '12px',
          marginTop: '20px',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 12px',
            background: '#050038',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '24px'
          }}>
            →
          </div>
          <p style={{ fontSize: '14px', color: '#666666', marginBottom: '16px', margin: '0 0 16px 0' }}>
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
              backgroundColor: '#050038',
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
          marginTop: '16px',
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
    );
  }

  return (
    <div className={styles.form} style={{ padding: '24px' }}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <Logo size="xl" />
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#050038',
          marginBottom: '8px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>Welcome</h1>
        <p style={{
          fontSize: '14px',
          color: '#666666',
          margin: 0
        }}>
          {isInMiro
            ? 'Click below to authenticate with your Miro account'
            : 'Sign in with your Miro account to continue'}
        </p>
      </div>

      {displayError && !accessDenied && (
        <div style={{
          padding: '12px',
          background: '#FEF2F2',
          border: '1px solid #EF4444',
          borderRadius: '8px',
          color: '#EF4444',
          fontSize: '14px',
          marginTop: '16px'
        }}>
          {displayError}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button
          type="button"
          onClick={isInMiro ? handleMiroAuth : handleMiroOAuth}
          disabled={isLoading || isAuthenticating}
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
            cursor: isLoading || isAuthenticating ? 'not-allowed' : 'pointer',
            opacity: isLoading || isAuthenticating ? 0.5 : 1
          }}
        >
          <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.392 4H14.15l3.242 8.333L14.15 20h3.242L20.634 12 17.392 4zM12.15 4H8.908l3.242 8.333L8.908 20h3.242L15.392 12 12.15 4zM6.908 4H3.366l3.542 8.333L3.366 20h3.542l3.542-8-3.542-7.667V4z" />
          </svg>
          {isLoading || isAuthenticating ? 'Authenticating...' : 'Sign in with Miro'}
        </button>
      </div>

      <div style={{
        marginTop: '16px',
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
          Your role (Admin, Designer, or Client) is determined by your account settings.
          Contact an administrator if you need access.
        </p>
      </div>
    </div>
  );
}
