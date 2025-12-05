import { supabase } from '@shared/lib/supabase';
import type { AuthUser, Session, LoginCredentials } from '../domain/auth.types';
import { LoginCredentialsSchema } from '../domain/auth.schema';

class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

class AuthService {
  async signIn(credentials: LoginCredentials): Promise<{ session: Session; user: AuthUser }> {
    const validated = LoginCredentialsSchema.parse(credentials);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      throw new AuthError(error.message, 'SIGN_IN_FAILED');
    }

    const user = await this.getCurrentUser();

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at || 0,
        user,
      },
      user,
    };
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new AuthError(error.message, 'SIGN_OUT_FAILED');
    }
  }

  async getSession(): Promise<Session | null> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session) {
      return null;
    }

    try {
      const user = await this.getCurrentUser();
      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at || 0,
        user,
      };
    } catch {
      return null;
    }
  }

  async refreshSession(): Promise<Session> {
    const { data, error } = await supabase.auth.refreshSession();

    if (error || !data.session) {
      throw new AuthError('Failed to refresh session', 'REFRESH_FAILED');
    }

    const user = await this.getCurrentUser();

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at || 0,
      user,
    };
  }

  async getCurrentUser(): Promise<AuthUser> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new AuthError('No authenticated user', 'NO_USER');
    }

    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      throw new AuthError('Failed to fetch user profile', 'PROFILE_NOT_FOUND');
    }

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      name: profile.name,
      avatarUrl: profile.avatar_url,
      miroUserId: profile.miro_user_id,
      primaryBoardId: profile.primary_board_id ?? null,
      isSuperAdmin: profile.is_super_admin ?? false,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  onAuthStateChange(callback: (event: string, session: unknown) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
}

export const authService = new AuthService();
