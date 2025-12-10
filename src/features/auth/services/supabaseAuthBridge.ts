/**
 * Supabase Auth Bridge
 *
 * Bridges Miro SDK authentication with Supabase Auth to enable proper RLS.
 *
 * Flow:
 * 1. User authenticates via Miro SDK (getMiroUserFromSdk)
 * 2. We create/sign-in a Supabase auth user using email + derived password
 * 3. Supabase session is established with auth.uid() = public.users.id
 * 4. RLS policies can now use auth.uid() for security
 *
 * The password is derived from miro_user_id + a secret, so it's:
 * - Deterministic (same user always gets same password)
 * - Secure (not guessable without the secret)
 * - Not stored anywhere (derived on-the-fly)
 */

import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('SupabaseAuthBridge');

// Secret used to derive passwords - should be in env vars in production
const AUTH_SECRET = import.meta.env.VITE_AUTH_SECRET || 'bd-studio-miro-auth-2024';

/**
 * Derive a deterministic password from miro_user_id
 * This allows us to sign in the same user consistently
 */
async function derivePassword(miroUserId: string): Promise<string> {
  // Create a hash of miro_user_id + secret
  const data = new TextEncoder().encode(`${miroUserId}:${AUTH_SECRET}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Return first 32 chars as password (128 bits of entropy)
  return hashHex.slice(0, 32);
}

export interface SupabaseAuthResult {
  success: boolean;
  userId?: string | undefined;
  error?: string | undefined;
}

export const supabaseAuthBridge = {
  /**
   * Sign in or create a Supabase auth user after Miro authentication
   *
   * @param userId - The public.users.id (UUID) from our users table
   * @param email - User's email
   * @param miroUserId - User's Miro ID (used to derive password)
   */
  async signInAfterMiroAuth(
    userId: string,
    email: string,
    miroUserId: string
  ): Promise<SupabaseAuthResult> {
    if (!miroUserId) {
      logger.error('Cannot sign in without miroUserId');
      return { success: false, error: 'Miro user ID is required' };
    }

    const password = await derivePassword(miroUserId);

    try {
      // First, try to sign in with existing credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData.session) {
        logger.info('Signed in to Supabase Auth', { userId, email });

        // Verify the auth user ID matches our users table ID
        // If not, we need to update the mapping
        if (signInData.user?.id !== userId) {
          logger.warn('Auth user ID mismatch, this should not happen', {
            authUserId: signInData.user?.id,
            publicUserId: userId,
          });
        }

        return { success: true, userId: signInData.user?.id };
      }

      // If sign in failed with invalid credentials, try to create the user
      if (signInError?.message?.includes('Invalid login credentials')) {
        logger.info('User not in auth, creating...', { email });

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Link to existing public.users record via metadata
            data: {
              public_user_id: userId,
              miro_user_id: miroUserId,
            },
          },
        });

        if (signUpError) {
          // If user already exists (email taken), try password reset flow
          if (signUpError.message?.includes('already registered')) {
            logger.warn('Email already registered with different password, attempting recovery');
            // For now, return error - in production, would need password reset flow
            return {
              success: false,
              error: 'Email already registered. Please contact support.',
            };
          }

          logger.error('Failed to create Supabase auth user', signUpError);
          return { success: false, error: signUpError.message };
        }

        // If email confirmation is disabled, user should be signed in
        if (signUpData.session) {
          logger.info('Created and signed in to Supabase Auth', { userId, email });

          // Link the auth user to public user for RLS
          if (signUpData.user?.id) {
            await this.linkAuthUser(userId, signUpData.user.id);
          }

          return { success: true, userId: signUpData.user?.id };
        }

        // If email confirmation is required, sign in after signup
        const { data: postSignupLogin, error: postSignupError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (postSignupError) {
          logger.error('Failed to sign in after signup', postSignupError);
          return { success: false, error: 'Account created but sign in failed' };
        }

        logger.info('Signed in after signup', { userId, email });

        // Link the auth user to public user for RLS
        if (postSignupLogin.user?.id) {
          await this.linkAuthUser(userId, postSignupLogin.user.id);
        }

        return { success: true, userId: postSignupLogin.user?.id };
      }

      // Other sign in errors
      logger.error('Supabase auth sign in failed', signInError);
      return { success: false, error: signInError?.message || 'Sign in failed' };

    } catch (error) {
      logger.error('Unexpected error in supabaseAuthBridge', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected authentication error',
      };
    }
  },

  /**
   * Link a Supabase Auth user to a public.users record
   * This enables RLS policies to find the user by auth.uid()
   */
  async linkAuthUser(publicUserId: string, authUserId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('link_auth_user', {
        p_public_user_id: publicUserId,
        p_auth_user_id: authUserId,
      });

      if (error) {
        logger.error('Failed to link auth user', { publicUserId, authUserId, error });
        return false;
      }

      logger.info('Linked auth user to public user', { publicUserId, authUserId, result: data });
      return data === true;
    } catch (error) {
      logger.error('Error linking auth user', error);
      return false;
    }
  },

  /**
   * Sign out of Supabase Auth
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      logger.info('Signed out of Supabase Auth');
    } catch (error) {
      logger.error('Error signing out of Supabase Auth', error);
    }
  },

  /**
   * Get current Supabase Auth session
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      logger.error('Error getting session', error);
      return null;
    }
    return session;
  },

  /**
   * Check if user is authenticated with Supabase
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return !!session;
  },
};
