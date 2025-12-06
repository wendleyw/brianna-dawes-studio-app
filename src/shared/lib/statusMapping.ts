/**
 * Centralized Status and Type Mapping
 *
 * This module provides consistent mapping between:
 * - UI values (used in frontend components)
 * - DB values (stored in Supabase)
 *
 * Usage:
 * import { mapDeliverableStatusToDb, mapDeliverableTypeToDb } from '@shared/lib/statusMapping';
 */

// ============ DELIVERABLE STATUS MAPPING ============

/**
 * UI Status values used in frontend
 */
export type UIDeliverableStatus =
  | 'draft'
  | 'in_progress'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'delivered';

/**
 * DB Status values stored in Supabase
 * Based on: CREATE TYPE deliverable_status AS ENUM ('pending', 'wip', 'review', 'approved')
 */
export type DBDeliverableStatus = 'pending' | 'wip' | 'review' | 'approved';

/**
 * Map UI deliverable status to DB status
 */
const DELIVERABLE_STATUS_UI_TO_DB: Record<string, DBDeliverableStatus> = {
  // UI -> DB
  draft: 'pending',
  in_progress: 'wip',
  in_review: 'review',
  approved: 'approved',
  rejected: 'pending', // fallback
  delivered: 'approved', // fallback
  // DB -> DB (passthrough)
  pending: 'pending',
  wip: 'wip',
  review: 'review',
};

/**
 * Map DB deliverable status to UI status
 */
const DELIVERABLE_STATUS_DB_TO_UI: Record<DBDeliverableStatus, UIDeliverableStatus> = {
  pending: 'draft',
  wip: 'in_progress',
  review: 'in_review',
  approved: 'approved',
};

export function mapDeliverableStatusToDb(uiStatus: string): DBDeliverableStatus {
  return DELIVERABLE_STATUS_UI_TO_DB[uiStatus] || 'pending';
}

export function mapDeliverableStatusToUi(dbStatus: string): UIDeliverableStatus {
  return DELIVERABLE_STATUS_DB_TO_UI[dbStatus as DBDeliverableStatus] || 'draft';
}

// ============ DELIVERABLE TYPE MAPPING ============

/**
 * UI Type values (more semantic, design-focused)
 */
export type UIDeliverableType =
  | 'concept'
  | 'design'
  | 'revision'
  | 'final'
  | 'image'
  | 'video'
  | 'document'
  | 'archive'
  | 'other';

/**
 * DB Type values stored in Supabase
 * Based on: CREATE TYPE deliverable_type AS ENUM ('image', 'video', 'document', 'archive', 'other')
 */
export type DBDeliverableType = 'image' | 'video' | 'document' | 'archive' | 'other';

/**
 * Map UI deliverable type to DB type
 */
const DELIVERABLE_TYPE_UI_TO_DB: Record<string, DBDeliverableType> = {
  // Semantic types -> 'other' (until DB is updated)
  concept: 'other',
  design: 'other',
  revision: 'other',
  final: 'other',
  // Direct mappings
  image: 'image',
  video: 'video',
  document: 'document',
  archive: 'archive',
  other: 'other',
};

export function mapDeliverableTypeToDb(uiType: string): DBDeliverableType {
  return DELIVERABLE_TYPE_UI_TO_DB[uiType] || 'other';
}

// ============ MIME TYPE MAPPING ============

/**
 * Map MIME types to deliverable types
 */
const MIME_TYPE_TO_DELIVERABLE: Record<string, DBDeliverableType> = {
  // Images
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  // Videos
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
  // Documents
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  // Archives
  'application/zip': 'archive',
  'application/x-rar-compressed': 'archive',
  'application/x-7z-compressed': 'archive',
};

export function mapMimeTypeToDeliverableType(mimeType: string): DBDeliverableType {
  return MIME_TYPE_TO_DELIVERABLE[mimeType] || 'other';
}

// ============ PROJECT STATUS (for reference) ============

/**
 * Project status values in DB (7 statuses after migration 013)
 */
export type ProjectStatus =
  | 'on_track'
  | 'overdue'
  | 'urgent'
  | 'critical'
  | 'in_progress'
  | 'review'
  | 'done';

/**
 * Project priority values
 */
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

// ============ HELPER: BATCH MAPPING ============

/**
 * Map an array of UI statuses to DB statuses
 */
export function mapDeliverableStatusArrayToDb(uiStatuses: string[]): DBDeliverableStatus[] {
  return uiStatuses.map(mapDeliverableStatusToDb);
}

/**
 * Map an array of UI types to DB types
 */
export function mapDeliverableTypeArrayToDb(uiTypes: string[]): DBDeliverableType[] {
  return uiTypes.map(mapDeliverableTypeToDb);
}
