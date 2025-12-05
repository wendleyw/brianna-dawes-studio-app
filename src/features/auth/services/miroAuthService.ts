import { supabase } from '@shared/lib/supabase';
import { env, isMainAdmin } from '@shared/config/env';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('MiroAuth');

export interface MiroUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'designer' | 'client';
    primaryBoardId: string | null;
    isSuperAdmin: boolean;
    miroUserId?: string;
  };
  error?: string;
  redirectTo?: string;
}

/**
 * Miro Authentication Service
 * Handles OAuth flow and user role verification
 */
export const miroAuthService = {
  /**
   * Get Miro OAuth URL
   */
  getAuthUrl(): string {
    const clientId = env.miro.clientId;
    const redirectUri = `${window.location.origin}/auth/miro/callback`;

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
    });

    return `https://miro.com/oauth/authorize?${params.toString()}`;
  },

  /**
   * Handle OAuth callback and authenticate user
   */
  async handleCallback(_code: string): Promise<AuthResult> {
    try {
      // Exchange code for tokens via your backend or Supabase Edge Function
      // For now, we'll use the Miro SDK to get user info if available
      const miroUser = await this.getMiroUserFromSdk();

      if (!miroUser) {
        return {
          success: false,
          error: 'Failed to get user information from Miro',
        };
      }

      // Authenticate with our system
      return await this.authenticateWithEmail(miroUser.email, miroUser.name);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  },

  /**
   * Get user info from Miro SDK (when running inside Miro)
   * Uses getUserInfo() to get the ACTUAL current user, not the app installer
   */
  async getMiroUserFromSdk(): Promise<MiroUser | null> {
    try {
      if (typeof window.miro === 'undefined') {
        logger.warn('Miro SDK not available');
        return null;
      }

      // IMPORTANT: Use getUserInfo() to get the CURRENT user accessing the board
      // This is different from getIdToken() which may return the app installer's info
      const userInfo = await window.miro.board.getUserInfo();
      logger.debug('getUserInfo() returned', userInfo);

      if (!userInfo || !userInfo.id) {
        logger.warn('No user info from getUserInfo()');
        return null;
      }

      // getUserInfo() may return email directly in some cases
      // Also try to get email from ID token as supplementary info
      let userEmail = (userInfo as { id: string; name: string; email?: string }).email || '';

      if (!userEmail) {
        try {
          const token = await window.miro.board.getIdToken();
          if (token && typeof token === 'string') {
            const tokenParts = token.split('.');
            if (tokenParts.length >= 2 && tokenParts[1]) {
              const payload = JSON.parse(atob(tokenParts[1]));
              logger.debug('Token payload', payload);
              userEmail = payload.email || payload.user_email || '';
            }
          }
        } catch (tokenError) {
          logger.warn('Could not get email from token', tokenError);
        }
      }

      const miroUser: MiroUser = {
        id: userInfo.id,
        email: userEmail,
        name: userInfo.name || (userEmail ? userEmail.split('@')[0] : `User-${userInfo.id.slice(0, 8)}`),
      };

      logger.debug('Final MiroUser', miroUser);
      return miroUser;
    } catch (error) {
      logger.error('Failed to get user from SDK', error);
      return null;
    }
  },

  /**
   * Authenticate user by Miro user info
   * First tries by miro_user_id, then falls back to email
   */
  async authenticateUser(miroUser: MiroUser): Promise<AuthResult> {
    const { id: miroUserId, email, name } = miroUser;
    logger.debug('Authenticating user', { miroUserId, email, name });

    // Check if this is the main admin from env (only if email is available)
    if (email && isMainAdmin(email)) {
      // Ensure main admin exists in database
      await this.ensureMainAdminExists(email, name || 'Admin', miroUserId);

      return {
        success: true,
        user: {
          id: 'main-admin',
          email,
          name: name || 'Admin',
          role: 'admin',
          primaryBoardId: null,
          isSuperAdmin: true,
          miroUserId,
        },
        redirectTo: '/admin',
      };
    }

    // First, try to find user by Miro user ID
    let user = null;

    const { data: userByMiroId } = await supabase
      .from('users')
      .select('*')
      .eq('miro_user_id', miroUserId)
      .maybeSingle();

    if (userByMiroId) {
      logger.debug('Found user by miro_user_id', { email: userByMiroId.email, role: userByMiroId.role });
      user = userByMiroId;
    } else if (email) {
      // Fall back to email lookup if miro_user_id not found
      const { data: userByEmail } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userByEmail) {
        logger.debug('Found user by email', { email: userByEmail.email, role: userByEmail.role });
        user = userByEmail;
        // Update user with miro_user_id for future lookups
        await supabase
          .from('users')
          .update({ miro_user_id: miroUserId })
          .eq('id', userByEmail.id);
      } else {
        logger.debug('No user found with email', { email });
      }
    }

    if (!user) {
      logger.warn('User not found, authentication failed', { miroUserId, name });
      return {
        success: false,
        error: `User not found. Your Miro ID is: ${miroUserId}. Please contact an administrator to link your account.`,
        // Include miroUserId so it can be used for account linking
      };
    }

    // Determine redirect based on role
    let redirectTo = '/dashboard';

    if (user.role === 'client' && user.primary_board_id) {
      // Redirect client to their primary board
      redirectTo = `/board/${user.primary_board_id}`;
    } else if (user.role === 'admin') {
      redirectTo = '/admin';
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        primaryBoardId: user.primary_board_id,
        isSuperAdmin: user.is_super_admin || false,
        miroUserId: user.miro_user_id || miroUserId,
      },
      redirectTo,
    };
  },

  /**
   * Authenticate user by email (legacy - kept for backwards compatibility)
   */
  async authenticateWithEmail(email: string, name?: string): Promise<AuthResult> {
    if (!email) {
      return {
        success: false,
        error: 'Email is required for authentication',
      };
    }
    return this.authenticateUser({ id: '', email, name: name || '' });
  },

  /**
   * Ensure main admin exists in database
   */
  async ensureMainAdminExists(email: string, name: string, miroUserId?: string): Promise<void> {
    const { data: existing } = await supabase
      .from('users')
      .select('id, miro_user_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (!existing) {
      // Create main admin user
      await supabase.from('users').insert({
        email: email.toLowerCase(),
        name,
        role: 'admin',
        is_super_admin: true,
        miro_user_id: miroUserId || null,
      });
    } else if (miroUserId && !existing.miro_user_id) {
      // Update existing admin with miro_user_id
      await supabase
        .from('users')
        .update({ miro_user_id: miroUserId })
        .eq('id', existing.id);
    }
  },

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    // Clear local storage
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  },
};

// Note: Window.miro type is declared in MiroContext.tsx
