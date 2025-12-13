import type { UserRole } from '@shared/config/roles';

export type SubscriptionPlanId = 'bronze' | 'silver' | 'gold';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  displayName: string;
  deliverablesLimit: number;
  color: string;
  sortOrder: number;
  isActive: boolean;
}

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
  // Subscription plan fields
  subscriptionPlanId: SubscriptionPlanId | null;
  deliverablesUsed: number;
  planStartDate: string | null;
  planEndDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientPlanStats {
  userId: string;
  userName: string;
  companyName: string | null;
  planId: SubscriptionPlanId | null;
  planName: string | null;
  deliverablesLimit: number;
  planColor: string | null;
  deliverablesUsed: number;
  usagePercentage: number;
  remainingCredits: number;
  planStartDate: string | null;
  planEndDate: string | null;
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
  subscriptionPlanId?: SubscriptionPlanId | null;
  deliverablesUsed?: number;
  planStartDate?: string | null;
  planEndDate?: string | null;
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

export type AdminTab = 'team' | 'boards' | 'master' | 'app' | 'sync' | 'developer';
