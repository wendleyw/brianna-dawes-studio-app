/**
 * Supabase Database Types
 *
 * Auto-generated based on database migrations.
 * These types provide type safety for Supabase queries.
 *
 * Usage:
 * import type { Database, Tables, Enums } from '@shared/types/database.types';
 *
 * const { data } = await supabase.from('projects').select('*');
 * // data is typed as Tables<'projects'>[]
 */

// ============ ENUMS ============

export type UserRole = 'admin' | 'designer' | 'client';

export type ProjectStatus =
  | 'overdue'
  | 'urgent'
  | 'in_progress'
  | 'review'
  | 'done';

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DeliverableStatus = 'draft' | 'in_review' | 'approved' | 'rejected' | 'delivered';

export type DeliverableType = 'image' | 'video' | 'document' | 'archive' | 'other';

export type FeedbackStatus = 'pending' | 'resolved';

// ============ TABLE TYPES ============

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  miro_user_id: string | null;
  auth_user_id: string | null; // Links to auth.users(id) for Supabase Auth integration
  primary_board_id: string | null;
  is_super_admin: boolean;
  company_name: string | null;
  company_logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserInsert {
  id?: string;
  email: string;
  name: string;
  role?: UserRole;
  avatar_url?: string | null;
  miro_user_id?: string | null;
  auth_user_id?: string | null;
  primary_board_id?: string | null;
  is_super_admin?: boolean;
  company_name?: string | null;
  company_logo_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserUpdate {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  avatar_url?: string | null;
  miro_user_id?: string | null;
  auth_user_id?: string | null;
  primary_board_id?: string | null;
  is_super_admin?: boolean;
  company_name?: string | null;
  company_logo_url?: string | null;
  updated_at?: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  client_id: string;
  miro_board_id: string | null;
  miro_board_url: string | null;
  thumbnail_url: string | null;
  briefing: Record<string, unknown> | null;
  was_reviewed: boolean;
  google_drive_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  id?: string;
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  client_id: string;
  miro_board_id?: string | null;
  miro_board_url?: string | null;
  thumbnail_url?: string | null;
  briefing?: Record<string, unknown> | null;
  was_reviewed?: boolean;
  google_drive_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  start_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  client_id?: string;
  miro_board_id?: string | null;
  miro_board_url?: string | null;
  thumbnail_url?: string | null;
  briefing?: Record<string, unknown> | null;
  was_reviewed?: boolean;
  google_drive_url?: string | null;
  updated_at?: string;
}

export interface ProjectDesignerRow {
  project_id: string;
  user_id: string;
  assigned_at: string;
}

export interface ProjectDesignerInsert {
  project_id: string;
  user_id: string;
  assigned_at?: string;
}

/**
 * Version object stored in the JSONB `versions` column.
 * This replaced the old `deliverable_versions` table (removed in migration 038).
 */
export interface DeliverableVersionJsonb {
  id: string;
  version: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_by_avatar: string | null;
  comment: string | null;
  created_at: string;
}

export interface DeliverableRow {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  type: DeliverableType;
  status: DeliverableStatus;
  miro_frame_id: string | null;
  miro_url: string | null;
  external_url: string | null;
  thumbnail_url: string | null;
  count: number;
  bonus_count: number;
  versions: DeliverableVersionJsonb[] | null;
  due_date: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliverableInsert {
  id?: string;
  project_id: string;
  name: string;
  description?: string | null;
  type?: DeliverableType;
  status?: DeliverableStatus;
  miro_frame_id?: string | null;
  miro_url?: string | null;
  external_url?: string | null;
  thumbnail_url?: string | null;
  count?: number;
  bonus_count?: number;
  versions?: DeliverableVersionJsonb[] | null;
  due_date?: string | null;
  delivered_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliverableUpdate {
  name?: string;
  description?: string | null;
  type?: DeliverableType;
  status?: DeliverableStatus;
  miro_frame_id?: string | null;
  miro_url?: string | null;
  external_url?: string | null;
  thumbnail_url?: string | null;
  count?: number;
  bonus_count?: number;
  versions?: DeliverableVersionJsonb[] | null;
  due_date?: string | null;
  delivered_at?: string | null;
  updated_at?: string;
}

export interface DeliverableFeedbackRow {
  id: string;
  deliverable_id: string;
  version_id: string;
  user_id: string;
  content: string;
  status: FeedbackStatus;
  miro_annotation_id: string | null;
  position: { x: number; y: number } | null;
  created_at: string;
  updated_at: string;
}

export interface DeliverableFeedbackInsert {
  id?: string;
  deliverable_id: string;
  version_id: string;
  user_id: string;
  content: string;
  status?: FeedbackStatus;
  miro_annotation_id?: string | null;
  position?: { x: number; y: number } | null;
  created_at?: string;
  updated_at?: string;
}

export interface DeliverableFeedbackUpdate {
  content?: string;
  status?: FeedbackStatus;
  miro_annotation_id?: string | null;
  position?: { x: number; y: number } | null;
  updated_at?: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert {
  id?: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  is_read?: boolean;
  created_at?: string;
}

export interface NotificationUpdate {
  type?: string;
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  is_read?: boolean;
}

export interface UserBoardRow {
  id: string;
  user_id: string;
  board_id: string;
  board_name: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBoardInsert {
  id?: string;
  user_id: string;
  board_id: string;
  board_name: string;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserBoardUpdate {
  board_id?: string;
  board_name?: string;
  is_primary?: boolean;
  updated_at?: string;
}

export interface AppSettingRow {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingInsert {
  id?: string;
  key: string;
  value: unknown;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AppSettingUpdate {
  key?: string;
  value?: unknown;
  description?: string | null;
  updated_at?: string;
}

// ============ DATABASE SCHEMA ============

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      projects: {
        Row: ProjectRow;
        Insert: ProjectInsert;
        Update: ProjectUpdate;
      };
      project_designers: {
        Row: ProjectDesignerRow;
        Insert: ProjectDesignerInsert;
        Update: never;
      };
      deliverables: {
        Row: DeliverableRow;
        Insert: DeliverableInsert;
        Update: DeliverableUpdate;
      };
      deliverable_feedback: {
        Row: DeliverableFeedbackRow;
        Insert: DeliverableFeedbackInsert;
        Update: DeliverableFeedbackUpdate;
      };
      notifications: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      user_boards: {
        Row: UserBoardRow;
        Insert: UserBoardInsert;
        Update: UserBoardUpdate;
      };
      app_settings: {
        Row: AppSettingRow;
        Insert: AppSettingInsert;
        Update: AppSettingUpdate;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      project_priority: ProjectPriority;
      deliverable_status: DeliverableStatus;
      deliverable_type: DeliverableType;
      feedback_status: FeedbackStatus;
    };
  };
}

// ============ HELPER TYPES ============

/**
 * Get the Row type for a table
 * Usage: Tables<'projects'> returns ProjectRow
 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/**
 * Get the Insert type for a table
 * Usage: TablesInsert<'projects'> returns ProjectInsert
 */
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/**
 * Get the Update type for a table
 * Usage: TablesUpdate<'projects'> returns ProjectUpdate
 */
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

/**
 * Get an enum type
 * Usage: Enums<'user_role'> returns UserRole
 */
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
