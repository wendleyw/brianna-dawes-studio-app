// Domain
export type {
  AuthUser,
  Session,
  AuthState,
  AuthContextValue,
  LoginCredentials,
  ProtectedRouteProps,
} from './domain/auth.types';

// Re-export UserRole from config
export type { UserRole } from '@config/roles';

export { loginSchema } from './domain/auth.schema';

// Services
export { authService } from './services/authService';

// Context
export { AuthContext, AuthProvider } from './context';

// Hooks
export { useAuth } from './hooks';

// Guards
export { ProtectedRoute } from './guards';

// Components
export { AccessDenied, LoginForm } from './components';
export type { AccessDeniedProps, LoginFormProps, LoginFormData } from './components';

// Pages
export { LoginPage } from './pages';
