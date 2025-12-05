import type { UserRole } from '@config/roles';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  avatarUrl: string | null;
  miroUserId: string | null;
  primaryBoardId: string | null;
  isSuperAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  loginWithMiro: () => Promise<string>; // Returns redirect URL
  authenticateFromMiro: () => Promise<{ redirectTo: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}
