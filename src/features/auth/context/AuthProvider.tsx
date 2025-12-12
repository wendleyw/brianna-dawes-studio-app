import { useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthContext';
import { authService } from '../services/authService';
import { miroAuthService } from '../services/miroAuthService';
import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type { AuthState, AuthContextValue, LoginCredentials, AuthUser } from '../domain/auth.types';

const logger = createLogger('AuthProvider');

const AUTH_STORAGE_KEY = 'bd_auth_user';

/**
 * Verify if a user still exists in the database and get latest data
 * Returns the user data if exists, null otherwise
 */
async function verifyUserExists(userId: string): Promise<{
  exists: boolean;
  role?: string;
  primaryBoardId?: string | null;
  name?: string;
  email?: string;
  isSuperAdmin?: boolean;
  companyName?: string | null;
  companyLogoUrl?: string | null;
}> {
  console.log('[verifyUserExists] Starting for userId:', userId);
  try {
    console.log('[verifyUserExists] Querying Supabase...');
    const { data, error } = await supabase
      .from('users')
      .select('id, role, primary_board_id, name, email, is_super_admin, company_name, company_logo_url')
      .eq('id', userId)
      .maybeSingle();

    console.log('[verifyUserExists] Query complete. Error:', error, 'Data:', data);

    if (error) {
      console.error('[verifyUserExists] Error verifying user existence', error);
      return { exists: false };
    }

    if (!data) {
      console.log('[verifyUserExists] No data returned');
      return { exists: false };
    }

    console.log('[verifyUserExists] User found:', data.email);
    return {
      exists: true,
      role: data.role as string,
      primaryBoardId: data.primary_board_id as string | null,
      name: data.name as string,
      email: data.email as string,
      isSuperAdmin: data.is_super_admin as boolean,
      companyName: data.company_name as string | null,
      companyLogoUrl: data.company_logo_url as string | null,
    };
  } catch (err) {
    console.error('[verifyUserExists] Exception:', err);
    return { exists: false };
  }
}

/**
 * Verify if a client has a board assignment
 * Returns true if client has primary_board_id or any entry in user_boards
 */
async function verifyClientHasBoardAssignment(userId: string, primaryBoardId: string | null): Promise<boolean> {
  // If user has primary board, they have access
  if (primaryBoardId) {
    return true;
  }

  try {
    // Check user_boards table
    const { data, error } = await supabase
      .from('user_boards')
      .select('id')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      logger.error('Error checking board assignment', error);
      return false;
    }

    return !!(data && data.length > 0);
  } catch (err) {
    logger.error('Failed to check board assignment', err);
    return false;
  }
}

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
      console.log('[AuthProvider] Starting initializeAuth...');
      try {
        // First, get the current Miro user to verify identity
        console.log('[AuthProvider] Getting Miro user from SDK...');
        const currentMiroUser = await miroAuthService.getMiroUserFromSdk();
        console.log('[AuthProvider] Current Miro user:', { id: currentMiroUser?.id, email: currentMiroUser?.email });

        // Check if we have a stored user (from Miro auth)
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        console.log('[AuthProvider] Stored user exists:', !!storedUser);
        if (storedUser) {
          const user = JSON.parse(storedUser) as AuthUser;
          console.log('[AuthProvider] Stored user:', { id: user.id, role: user.role, miroUserId: user.miroUserId });

          // IMPORTANT: Verify the stored user matches the current Miro user
          // If miroUserId doesn't match, we need to re-authenticate
          if (currentMiroUser && currentMiroUser.id && user.miroUserId && currentMiroUser.id !== user.miroUserId) {
            console.log('[AuthProvider] Miro user changed, re-authenticating');
            localStorage.removeItem(AUTH_STORAGE_KEY);
            // Don't return - fall through to check Supabase session or trigger re-auth
          } else if (currentMiroUser && currentMiroUser.id && !user.miroUserId) {
            // Stored user doesn't have miroUserId - force re-auth to get it
            console.log('[AuthProvider] Stored user missing miroUserId, forcing re-auth');
            localStorage.removeItem(AUTH_STORAGE_KEY);
            // Don't return - fall through to trigger re-auth
          } else {
            // Verify user still exists in database before using cached data
            console.log('[AuthProvider] Verifying stored user exists in database...');
            const userCheck = await verifyUserExists(user.id);
            console.log('[AuthProvider] User verification result:', userCheck);

            if (!userCheck.exists) {
              logger.info('Stored user no longer exists in database, clearing cache', { id: user.id });
              localStorage.removeItem(AUTH_STORAGE_KEY);
              // Fall through to trigger re-auth
            } else {
              // IMPORTANT: Sync user data from database (role may have changed)
              const updatedUser: AuthUser = {
                ...user,
                role: userCheck.role as AuthUser['role'],
                name: userCheck.name || user.name,
                email: userCheck.email || user.email,
                primaryBoardId: userCheck.primaryBoardId ?? null,
                isSuperAdmin: userCheck.isSuperAdmin ?? false,
                companyName: userCheck.companyName ?? null,
                companyLogoUrl: userCheck.companyLogoUrl ?? null,
              };

              // Check if user data changed and update localStorage
              if (user.role !== updatedUser.role ||
                  user.primaryBoardId !== updatedUser.primaryBoardId ||
                  user.isSuperAdmin !== updatedUser.isSuperAdmin ||
                  user.companyName !== updatedUser.companyName ||
                  user.companyLogoUrl !== updatedUser.companyLogoUrl) {
                logger.info('User data changed in database, updating cache', {
                  oldRole: user.role,
                  newRole: updatedUser.role,
                  isSuperAdmin: updatedUser.isSuperAdmin,
                  companyName: updatedUser.companyName,
                });
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
              }

              // For clients, verify they have a board assignment
              if (updatedUser.role === 'client') {
                const hasBoardAssignment = await verifyClientHasBoardAssignment(user.id, userCheck.primaryBoardId ?? null);
                if (!hasBoardAssignment) {
                  logger.info('Client has no board assignment, clearing cache to trigger re-auth', { id: user.id });
                  localStorage.removeItem(AUTH_STORAGE_KEY);
                  // Fall through to trigger re-auth (will show "Pending Board Assignment" screen)
                } else {
                  logger.debug('Using updated client user with board assignment', { name: updatedUser.name, role: updatedUser.role });
                  setState({
                    user: updatedUser,
                    session: null,
                    isLoading: false,
                    isAuthenticated: true,
                    error: null,
                  });
                  return;
                }
              } else {
                // Non-client users (admin, designer) don't need board assignment
                logger.debug('Using updated user', { name: updatedUser.name, role: updatedUser.role });
                setState({
                  user: updatedUser,
                  session: null,
                  isLoading: false,
                  isAuthenticated: true,
                  error: null,
                });
                return;
              }
            }
          }
        }

        // Then check Supabase session
        console.log('[AuthProvider] Checking Supabase session...');
        const session = await authService.getSession();
        console.log('[AuthProvider] Supabase session exists:', !!session);
        if (session) {
          console.log('[AuthProvider] Setting authenticated state from session');
          setState({
            user: session.user,
            session,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          });
        } else {
          console.log('[AuthProvider] No session, setting isLoading: false');
          setState({ ...initialState, isLoading: false });
        }
      } catch (error) {
        console.error('[AuthProvider] Error during initialization:', error);
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
          // SECURITY: Re-validate user role on token refresh
          // This ensures that if an admin removes a user's role, they lose access
          const currentUser = state.user;
          if (currentUser) {
            const userCheck = await verifyUserExists(currentUser.id);

            if (!userCheck.exists) {
              // User no longer exists in database - force logout
              logger.warn('User no longer exists on token refresh, forcing logout', { userId: currentUser.id });
              localStorage.removeItem(AUTH_STORAGE_KEY);
              setState({ ...initialState, isLoading: false });
              queryClient.clear();
              return;
            }

            // Check if role changed
            if (userCheck.role !== currentUser.role) {
              logger.warn('User role changed on token refresh', {
                userId: currentUser.id,
                oldRole: currentUser.role,
                newRole: userCheck.role
              });

              // Update user with new role and clear any stale permissions
              const updatedUser: AuthUser = {
                ...currentUser,
                role: userCheck.role as AuthUser['role'],
                primaryBoardId: userCheck.primaryBoardId ?? null,
                isSuperAdmin: userCheck.isSuperAdmin ?? false,
                companyName: userCheck.companyName ?? null,
                companyLogoUrl: userCheck.companyLogoUrl ?? null,
              };

              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
              setState((prev) => ({ ...prev, session, user: updatedUser }));

              // Invalidate all queries to force re-fetch with new permissions
              queryClient.invalidateQueries();
              return;
            }
          }

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
        companyName: result.user.companyName ?? null,
        companyLogoUrl: result.user.companyLogoUrl ?? null,
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
