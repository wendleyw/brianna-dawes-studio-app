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
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
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
};
