import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type {
  User,
  UserBoard,
  AppSetting,
  CreateUserInput,
  UpdateUserInput,
  AssignBoardInput,
  UpdateAppSettingInput,
  SubscriptionPlan,
  ClientPlanStats,
  SubscriptionPlanId,
} from '../domain';

const logger = createLogger('AdminService');

/**
 * AdminService - Handles administrative operations for the Miro app
 *
 * This service provides functionality for:
 * - User management (CRUD operations, role assignments)
 * - Board assignments (linking users to Miro boards)
 * - App settings management (global configuration)
 *
 * All operations respect Supabase RLS policies for security.
 * Only admin users can access most of these operations.
 *
 * @example
 * ```typescript
 * // Get all users
 * const users = await adminService.getUsers();
 *
 * // Create a new user
 * const user = await adminService.createUser({
 *   email: 'user@example.com',
 *   name: 'John Doe',
 *   role: 'designer'
 * });
 * ```
 */
export const adminService = {
  // ============ USER MANAGEMENT ============

  /**
   * Get all users
   */
  async getUsers(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapUserFromDb);
  },

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? mapUserFromDb(data) : null;
  },

  /**
   * Create a new user
   * Note: For Miro apps, we create users directly in the users table
   * since authentication is handled by Miro OAuth
   */
  async createUser(input: CreateUserInput): Promise<User> {
    // Generate a UUID for the new user
    const userId = crypto.randomUUID();

    // Create user profile directly
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
        avatar_url: input.avatarUrl || null,
        miro_user_id: input.miroUserId || null,
        company_name: input.companyName || null,
        company_logo_url: input.companyLogoUrl || null,
      })
      .select()
      .single();

    if (error) throw error;

    return mapUserFromDb(data);
  },

  /**
   * Update a user
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const updates: Record<string, unknown> = {};

    if (input.name !== undefined) updates.name = input.name;
    if (input.role !== undefined) updates.role = input.role;
    if (input.primaryBoardId !== undefined) updates.primary_board_id = input.primaryBoardId;
    if (input.avatarUrl !== undefined) updates.avatar_url = input.avatarUrl;
    if (input.miroUserId !== undefined) updates.miro_user_id = input.miroUserId;
    if (input.companyName !== undefined) updates.company_name = input.companyName;
    if (input.companyLogoUrl !== undefined) updates.company_logo_url = input.companyLogoUrl;
    if (input.subscriptionPlanId !== undefined) updates.subscription_plan_id = input.subscriptionPlanId;
    if (input.deliverablesUsed !== undefined) updates.deliverables_used = input.deliverablesUsed;
    if (input.planStartDate !== undefined) updates.plan_start_date = input.planStartDate;
    if (input.planEndDate !== undefined) updates.plan_end_date = input.planEndDate;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return mapUserFromDb(data);
  },

  /**
   * Delete a user
   */
  async deleteUser(id: string): Promise<void> {
    logger.debug('Deleting user', { id });

    const { error, count } = await supabase
      .from('users')
      .delete()
      .eq('id', id)
      .select();

    logger.debug('Delete result', { error, count });

    if (error) {
      logger.error('Delete user failed', error);
      throw error;
    }

    logger.info('User deleted successfully', { id });
  },

  // ============ BOARD ASSIGNMENTS ============

  /**
   * Get boards for a user
   */
  async getUserBoards(userId: string): Promise<UserBoard[]> {
    const { data, error } = await supabase
      .from('user_boards')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapUserBoardFromDb);
  },

  /**
   * Get all board assignments
   */
  async getAllBoardAssignments(): Promise<UserBoard[]> {
    const { data, error } = await supabase
      .from('user_boards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(mapUserBoardFromDb);
  },

  /**
   * Get all boards (master list)
   */
  async getBoards(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from('boards')
      .select('id, name')
      .order('name');

    if (error) throw error;

    return data || [];
  },

  /**
   * Create or update a board
   */
  async upsertBoard(id: string, name: string): Promise<{ id: string; name: string }> {
    const { data, error } = await supabase
      .from('boards')
      .upsert({ id, name, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    return { id: data.id, name: data.name };
  },

  /**
   * Assign board to user
   */
  async assignBoard(input: AssignBoardInput): Promise<UserBoard> {
    const { data, error } = await supabase
      .from('user_boards')
      .insert({
        user_id: input.userId,
        board_id: input.boardId,
        board_name: input.boardName,
        is_primary: input.isPrimary || false,
      })
      .select()
      .single();

    if (error) throw error;

    // If primary, update user and other boards
    if (input.isPrimary) {
      await supabase.rpc('set_primary_board', {
        p_user_id: input.userId,
        p_board_id: input.boardId,
      });
    }

    return mapUserBoardFromDb(data);
  },

  /**
   * Remove board from user
   */
  async removeBoard(userId: string, boardId: string): Promise<void> {
    const { error } = await supabase
      .from('user_boards')
      .delete()
      .eq('user_id', userId)
      .eq('board_id', boardId);

    if (error) throw error;
  },

  /**
   * Set primary board for user
   */
  async setPrimaryBoard(userId: string, boardId: string): Promise<void> {
    const { error } = await supabase.rpc('set_primary_board', {
      p_user_id: userId,
      p_board_id: boardId,
    });

    if (error) throw error;
  },

  // ============ APP SETTINGS ============

  /**
   * Get all app settings
   */
  async getAppSettings(): Promise<AppSetting[]> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('key');

    if (error) throw error;

    return (data || []).map(mapAppSettingFromDb);
  },

  /**
   * Get a specific setting
   */
  async getSetting(key: string): Promise<unknown> {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data?.value;
  },

  /**
   * Update a setting
   */
  async updateSetting(input: UpdateAppSettingInput): Promise<AppSetting> {
    const { data, error } = await supabase
      .from('app_settings')
      .update({ value: input.value })
      .eq('key', input.key)
      .select()
      .single();

    if (error) throw error;

    return mapAppSettingFromDb(data);
  },

  /**
   * Upsert a setting (create if not exists, update if exists)
   */
  async upsertSetting(input: UpdateAppSettingInput & { description?: string }): Promise<AppSetting> {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: input.key,
          value: input.value,
          description: input.description || null,
        },
        { onConflict: 'key' }
      )
      .select()
      .single();

    if (error) throw error;

    return mapAppSettingFromDb(data);
  },

  // ============ SUBSCRIPTION PLANS ============

  /**
   * Get all subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (error) throw error;

    return (data || []).map(mapSubscriptionPlanFromDb);
  },

  /**
   * Get client plan stats
   */
  async getClientPlanStats(userId: string): Promise<ClientPlanStats | null> {
    const { data, error } = await supabase
      .from('client_plan_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data ? mapClientPlanStatsFromDb(data) : null;
  },

  /**
   * Get client plan stats by board ID
   */
  async getClientPlanStatsByBoard(boardId: string): Promise<ClientPlanStats | null> {
    // First find the primary client for this board
    const { data: boardAssignment, error: boardError } = await supabase
      .from('user_boards')
      .select('user_id')
      .eq('board_id', boardId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    if (boardError || !boardAssignment) {
      // Try to find any client assigned to this board
      const { data: anyAssignment, error: anyError } = await supabase
        .from('user_boards')
        .select('user_id, users!inner(role)')
        .eq('board_id', boardId)
        .eq('users.role', 'client')
        .limit(1)
        .maybeSingle();

      if (anyError || !anyAssignment) return null;
      return this.getClientPlanStats(anyAssignment.user_id);
    }

    return this.getClientPlanStats(boardAssignment.user_id);
  },

  /**
   * Assign subscription plan to user
   */
  async assignSubscriptionPlan(
    userId: string,
    planId: SubscriptionPlanId | null,
    resetUsage: boolean = false
  ): Promise<User> {
    const updates: Record<string, unknown> = {
      subscription_plan_id: planId,
    };

    if (planId && resetUsage) {
      updates.deliverables_used = 0;
      updates.plan_start_date = new Date().toISOString();
      updates.plan_end_date = null;
    }

    if (!planId) {
      updates.plan_start_date = null;
      updates.plan_end_date = null;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return mapUserFromDb(data);
  },

  /**
   * Update deliverables used count
   */
  async updateDeliverablesUsed(userId: string, count: number): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ deliverables_used: count })
      .eq('id', userId);

    if (error) throw error;
  },

  /**
   * Increment deliverables used
   */
  async incrementDeliverablesUsed(userId: string, amount: number = 1): Promise<void> {
    const { error } = await supabase.rpc('increment_deliverables_used', {
      p_user_id: userId,
      p_amount: amount,
    });

    // If the RPC doesn't exist, fallback to manual update
    if (error) {
      const { data: user } = await supabase
        .from('users')
        .select('deliverables_used')
        .eq('id', userId)
        .single();

      if (user) {
        await supabase
          .from('users')
          .update({ deliverables_used: (user.deliverables_used || 0) + amount })
          .eq('id', userId);
      }
    }
  },

  /**
   * Get total assets count from all deliverables for a client
   * This sums the 'count' field from all deliverables in the client's projects
   */
  async getClientTotalAssets(clientId: string): Promise<number> {
    // Get all projects for this client
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('client_id', clientId);

    if (projectsError || !projects || projects.length === 0) {
      return 0;
    }

    const projectIds = projects.map(p => p.id);

    // Sum all deliverable counts for these projects
    const { data: deliverables, error: deliverablesError } = await supabase
      .from('deliverables')
      .select('count')
      .in('project_id', projectIds);

    if (deliverablesError || !deliverables) {
      return 0;
    }

    return deliverables.reduce((sum, d) => sum + (d.count || 0), 0);
  },

  /**
   * Get total assets count for a client by board ID
   */
  async getClientTotalAssetsByBoard(boardId: string): Promise<number> {
    // First find the primary client for this board
    const { data: boardAssignment, error: boardError } = await supabase
      .from('user_boards')
      .select('user_id')
      .eq('board_id', boardId)
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    if (boardError || !boardAssignment) {
      // Try to find any client assigned to this board
      const { data: anyAssignment, error: anyError } = await supabase
        .from('user_boards')
        .select('user_id, users!inner(role)')
        .eq('board_id', boardId)
        .eq('users.role', 'client')
        .limit(1)
        .maybeSingle();

      if (anyError || !anyAssignment) return 0;
      return this.getClientTotalAssets(anyAssignment.user_id);
    }

    return this.getClientTotalAssets(boardAssignment.user_id);
  },
};

// ============ MAPPERS ============

function mapUserFromDb(data: Record<string, unknown>): User {
  return {
    id: data.id as string,
    email: data.email as string,
    name: data.name as string,
    role: data.role as User['role'],
    avatarUrl: data.avatar_url as string | null,
    miroUserId: data.miro_user_id as string | null,
    primaryBoardId: data.primary_board_id as string | null,
    isSuperAdmin: data.is_super_admin as boolean,
    companyName: (data.company_name as string | null) ?? null,
    companyLogoUrl: (data.company_logo_url as string | null) ?? null,
    subscriptionPlanId: data.subscription_plan_id as SubscriptionPlanId | null,
    deliverablesUsed: (data.deliverables_used as number) ?? 0,
    planStartDate: data.plan_start_date as string | null,
    planEndDate: data.plan_end_date as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapSubscriptionPlanFromDb(data: Record<string, unknown>): SubscriptionPlan {
  return {
    id: data.id as SubscriptionPlanId,
    name: data.name as string,
    displayName: data.display_name as string,
    deliverablesLimit: data.deliverables_limit as number,
    color: data.color as string,
    sortOrder: data.sort_order as number,
    isActive: data.is_active as boolean,
  };
}

function mapClientPlanStatsFromDb(data: Record<string, unknown>): ClientPlanStats {
  return {
    userId: data.user_id as string,
    userName: data.user_name as string,
    companyName: data.company_name as string | null,
    planId: data.plan_id as SubscriptionPlanId | null,
    planName: data.plan_name as string | null,
    deliverablesLimit: (data.deliverables_limit as number) ?? 0,
    planColor: data.plan_color as string | null,
    deliverablesUsed: (data.deliverables_used as number) ?? 0,
    usagePercentage: (data.usage_percentage as number) ?? 0,
    remainingCredits: (data.remaining_credits as number) ?? 0,
    planStartDate: data.plan_start_date as string | null,
    planEndDate: data.plan_end_date as string | null,
  };
}

function mapUserBoardFromDb(data: Record<string, unknown>): UserBoard {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    boardId: data.board_id as string,
    boardName: data.board_name as string,
    isPrimary: data.is_primary as boolean,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

function mapAppSettingFromDb(data: Record<string, unknown>): AppSetting {
  return {
    id: data.id as string,
    key: data.key as string,
    value: data.value,
    description: data.description as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

// Query keys for React Query
export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  user: (id: string) => [...adminKeys.users(), id] as const,
  userBoards: (userId: string) => [...adminKeys.all, 'userBoards', userId] as const,
  allBoards: () => [...adminKeys.all, 'allBoards'] as const,
  boards: () => [...adminKeys.all, 'boards'] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  setting: (key: string) => [...adminKeys.settings(), key] as const,
  subscriptionPlans: () => [...adminKeys.all, 'subscriptionPlans'] as const,
  clientPlanStats: (userId: string) => [...adminKeys.all, 'clientPlanStats', userId] as const,
  clientPlanStatsByBoard: (boardId: string) => [...adminKeys.all, 'clientPlanStatsByBoard', boardId] as const,
};
