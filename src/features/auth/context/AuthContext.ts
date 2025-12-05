import { createContext } from 'react';
import type { AuthContextValue } from '../domain/auth.types';

export const AuthContext = createContext<AuthContextValue | null>(null);
