import { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthContext';
import { authService } from '../services/authService';
import { miroAuthService } from '../services/miroAuthService';
import { supabaseAuthBridge } from '../services/supabaseAuthBridge';
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
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = state.user;
  }, [state.user]);

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
          let bridgedTokens: { accessToken: string; refreshToken: string; expiresAt: number } | null = null;

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
            // Miro user ID matches stored user
            // Re-establish Supabase session and verify user data is still current
            console.log('[AuthProvider] Miro user matches stored user, attempting Supabase session...');

            // Re-establish Supabase Auth session for RLS (with timeout)
            if (user.miroUserId) {
              try {
                // Add a 5-second timeout to prevent hanging
                const authPromise = supabaseAuthBridge.signInAfterMiroAuth(
                  user.id,
                  user.email,
                  user.miroUserId
                );
                const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) =>
                  setTimeout(() => resolve({ success: false, error: 'Timeout' }), 5000)
                );

                const authResult = await Promise.race([authPromise, timeoutPromise]);

                if (!authResult.success) {
                  console.warn('[AuthProvider] Supabase session failed (will use anon):', authResult.error);
                } else {
                  console.log('[AuthProvider] Supabase session re-established successfully');
                  if (authResult.accessToken && authResult.refreshToken) {
                    bridgedTokens = {
                      accessToken: authResult.accessToken,
                      refreshToken: authResult.refreshToken,
                      expiresAt: authResult.expiresAt ?? 0,
                    };
                  }
                }
              } catch (err) {
                console.warn('[AuthProvider] Supabase session error (will use anon):', err);
              }
            }

            // IMPORTANT: Always verify user data from DB to catch role changes
            console.log('[AuthProvider] Verifying user data from database...');
            const userCheck = await verifyUserExists(user.id);

            if (!userCheck.exists) {
              // User no longer exists - clear cache and require re-auth
              console.log('[AuthProvider] User no longer exists in DB, clearing cache');
              localStorage.removeItem(AUTH_STORAGE_KEY);
              setState({ ...initialState, isLoading: false });
              return;
            }

            // Update user with latest data from DB (role, primaryBoardId, etc.)
            const updatedUser: AuthUser = {
              ...user,
              role: (userCheck.role as AuthUser['role']) ?? user.role,
              name: userCheck.name ?? user.name,
              email: userCheck.email ?? user.email,
              primaryBoardId: userCheck.primaryBoardId ?? user.primaryBoardId,
              isSuperAdmin: userCheck.isSuperAdmin ?? user.isSuperAdmin,
              companyName: userCheck.companyName ?? user.companyName,
              companyLogoUrl: userCheck.companyLogoUrl ?? user.companyLogoUrl,
            };

            // Check if anything changed
            if (userCheck.role !== user.role) {
              console.log('[AuthProvider] User role changed:', user.role, '->', userCheck.role);
              localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
            }

            console.log('[AuthProvider] Setting authenticated state with verified data');
            setState({
              user: updatedUser,
              session: bridgedTokens
                ? {
                    accessToken: bridgedTokens.accessToken,
                    refreshToken: bridgedTokens.refreshToken,
                    expiresAt: bridgedTokens.expiresAt,
                    user: updatedUser,
                  }
                : null,
              isLoading: false,
              isAuthenticated: true,
              error: null,
            });
            return;
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
          const currentUser = userRef.current;
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
