// Common types used across the application

export interface ApiError {
  message: string;
  code: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SelectOption {
  label: string;
  value: string;
}

// Re-export role types from config
export type { UserRole } from '@config/roles';

// Re-export database types
export type {
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  // Individual table types
  UserRow,
  UserInsert,
  UserUpdate,
  ProjectRow,
  ProjectInsert,
  ProjectUpdate,
  ProjectDesignerRow,
  DeliverableRow,
  DeliverableInsert,
  DeliverableUpdate,
  NotificationRow,
  UserBoardRow,
  AppSettingRow,
  // Enum types
  ProjectStatus,
  ProjectPriority,
  DeliverableStatus,
  DeliverableType,
} from './database.types';
