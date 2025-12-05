import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthContext';
import { authService } from '../services/authService';
import { miroAuthService } from '../services/miroAuthService';
import { createLogger } from '@shared/lib/logger';
import type { AuthState, AuthContextValue, LoginCredentials, AuthUser } from '../domain/auth.types';

const logger = createLogger('AuthProvider');

const AUTH_STORAGE_KEY = 'bd_auth_user';

const initialState: AuthState = {
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(initialState);
  const queryClient = useQueryClient();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // First, get the current Miro user to verify identity
        const currentMiroUser = await miroAuthService.getMiroUserFromSdk();
        logger.debug('Current Miro user', { id: currentMiroUser?.id, email: currentMiroUser?.email });

        // Check if we have a stored user (from Miro auth)
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
          const user = JSON.parse(storedUser) as AuthUser;
          logger.debug('Stored user', { id: user.id, role: user.role, miroUserId: user.miroUserId });

          // IMPORTANT: Verify the stored user matches the current Miro user
          // If miroUserId doesn't match, we need to re-authenticate
          if (currentMiroUser && currentMiroUser.id && user.miroUserId && currentMiroUser.id !== user.miroUserId) {
            logger.info('Miro user changed, re-authenticating', { stored: user.miroUserId, current: currentMiroUser.id });
            localStorage.removeItem(AUTH_STORAGE_KEY);
            // Don't return - fall through to check Supabase session or trigger re-auth
          } else if (currentMiroUser && currentMiroUser.id && !user.miroUserId) {
            // Stored user doesn't have miroUserId - force re-auth to get it
            logger.info('Stored user missing miroUserId, forcing re-auth');
            localStorage.removeItem(AUTH_STORAGE_KEY);
            // Don't return - fall through to trigger re-auth
          } else {
            logger.debug('Using stored user', { name: user.name, role: user.role });
            setState({
              user,
              session: null,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return;
          }
        }

        // Then check Supabase session
        const session = await authService.getSession();
        if (session) {
          setState({
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } else {
          setState({ ...initialState, isLoading: false });
        }
      } catch (error) {
        setState({
          ...initialState,
          isLoading: false,
          error: error instanceof Error ? error : new Error('Failed to initialize auth'),
        });
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        const session = await authService.getSession();
        if (session) {
          setState({
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setState({ ...initialState, isLoading: false });
        queryClient.clear();
      } else if (event === 'TOKEN_REFRESHED') {
        const session = await authService.getSession();
        if (session) {
          setState((prev) => ({ ...prev, session }));
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient]);

  // Traditional email/password login
  const login = useCallback(async (credentials: LoginCredentials) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { session, user } = await authService.signIn(credentials);
      setState({
        user,
        session,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Login failed'),
      }));
      throw error;
    }
  }, []);

  // Get Miro OAuth URL
  const loginWithMiro = useCallback(async (): Promise<string> => {
    return miroAuthService.getAuthUrl();
  }, []);

  // Authenticate from Miro (when running inside Miro)
  const authenticateFromMiro = useCallback(async (): Promise<{ redirectTo: string }> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get user info from Miro SDK
      const miroUser = await miroAuthService.getMiroUserFromSdk();

      if (!miroUser) {
        throw new Error('Could not get user information from Miro. Please ensure you are running inside Miro.');
      }

      if (!miroUser.id) {
        throw new Error('Could not get Miro user ID. Please try again.');
      }

      // Authenticate with our backend using the new method that supports miro_user_id
      const result = await miroAuthService.authenticateUser(miroUser);

      if (!result.success || !result.user) {
        throw new Error(result.error || 'Authentication failed');
      }

      // Create auth user object
      const user: AuthUser = {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        avatarUrl: null,
        miroUserId: miroUser.id,
        primaryBoardId: result.user.primaryBoardId,
        isSuperAdmin: result.user.isSuperAdmin,
      };

      // Store in localStorage
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

      setState({
        user,
        session: null,
        isLoading: false,
        isAuthenticated: true,
        error: null,
      });

      return { redirectTo: result.redirectTo || '/dashboard' };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Authentication failed');
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err,
      }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      await authService.signOut();
      await miroAuthService.signOut();
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setState({ ...initialState, isLoading: false });
      queryClient.clear();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Logout failed'),
      }));
    }
  }, [queryClient]);

  const refreshSession = useCallback(async () => {
    try {
      const session = await authService.refreshSession();
      setState((prev) => ({ ...prev, session }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error : new Error('Refresh failed'),
      }));
      throw error;
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      ...state,
      login,
      loginWithMiro,
      authenticateFromMiro,
      logout,
      refreshSession,
    }),
    [state, login, loginWithMiro, authenticateFromMiro, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
