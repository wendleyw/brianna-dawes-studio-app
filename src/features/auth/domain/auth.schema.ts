import { z } from 'zod';

export const LoginCredentialsSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required').min(8, 'Password must be at least 8 characters'),
});

// Alias for compatibility
export const loginSchema = LoginCredentialsSchema;

export const UserRoleSchema = z.enum(['admin', 'designer', 'client']);

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  miroUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type LoginCredentialsInput = z.infer<typeof LoginCredentialsSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
