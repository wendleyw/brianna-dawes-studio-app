import type { UserRole } from '@shared/config/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  miroUserId: string | null;
  primaryBoardId: string | null;
  isSuperAdmin: boolean;
  companyName: string | null;
  companyLogoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserBoard {
  id: string;
  userId: string;
  boardId: string;
  boardName: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  password?: string; // Optional - not used for Miro auth
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
  miroUserId?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  primaryBoardId?: string | null;
  avatarUrl?: string | null;
  miroUserId?: string | null;
  companyName?: string | null;
  companyLogoUrl?: string | null;
}

export interface AssignBoardInput {
  userId: string;
  boardId: string;
  boardName: string;
  isPrimary?: boolean;
}

export interface UpdateAppSettingInput {
  key: string;
  value: unknown;
}

export type AdminTab = 'users' | 'boards' | 'settings' | 'developer';
