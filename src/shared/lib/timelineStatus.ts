/**
 * Timeline Status - Unified status system for the entire application
 *
 * These 7 statuses are stored directly in the database and used everywhere:
 * - ProjectCard panel
 * - BoardModalApp (Trello-style board)
 * - Miro Master Timeline
 * - Dashboard reports
 * - Filters
 */

import type { ProjectStatus } from '@features/projects/domain/project.types';

// Re-export ProjectStatus as TimelineStatus for backward compatibility
export type TimelineStatus = ProjectStatus;

// Status column configuration
export interface StatusColumn {
  id: ProjectStatus;
  label: string;
  color: string;
  description: string;
}

// The 7 status columns - single source of truth
export const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'critical', label: 'CRITICAL', color: '#EF4444', description: 'Urgent & overdue - needs immediate attention' },
  { id: 'overdue', label: 'OVERDUE', color: '#F97316', description: 'Past due date' },
  { id: 'urgent', label: 'URGENT', color: '#EAB308', description: 'High priority, deadline approaching' },
  { id: 'on_track', label: 'ON TRACK', color: '#3B82F6', description: 'Normal priority, on schedule' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#8B5CF6', description: 'Actively being worked on' },
  { id: 'review', label: 'REVIEW', color: '#6366F1', description: 'Awaiting client review/approval' },
  { id: 'done', label: 'DONE', color: '#22C55E', description: 'Completed' },
];

// Backward compatibility: TIMELINE_COLUMNS is an alias for STATUS_COLUMNS
export const TIMELINE_COLUMNS = STATUS_COLUMNS;
export type TimelineColumn = StatusColumn;

// Default column (on_track)
const DEFAULT_COLUMN: StatusColumn = STATUS_COLUMNS[3]!;

// Get status column by ID
export function getStatusColumn(status: ProjectStatus): StatusColumn {
  return STATUS_COLUMNS.find(col => col.id === status) ?? DEFAULT_COLUMN;
}

// Backward compatibility alias
export function getTimelineColumn(status: ProjectStatus): StatusColumn {
  return getStatusColumn(status);
}

// Get status directly from project (no derivation needed anymore!)
export function getTimelineStatus(project: { status: ProjectStatus }): ProjectStatus {
  return project.status;
}

// Get badge variant for status
export function getStatusVariant(status: ProjectStatus): 'error' | 'warning' | 'info' | 'success' | 'neutral' {
  switch (status) {
    case 'critical':
      return 'error';
    case 'overdue':
    case 'urgent':
      return 'warning';
    case 'on_track':
    case 'in_progress':
      return 'info';
    case 'review':
      return 'warning';
    case 'done':
      return 'success';
    default:
      return 'neutral';
  }
}

// Backward compatibility alias
export function getTimelineStatusVariant(status: ProjectStatus): 'error' | 'warning' | 'info' | 'success' | 'neutral' {
  return getStatusVariant(status);
}

// No longer needed - status is direct, not derived
// Kept for backward compatibility but just returns the status as-is
export function getDbStatusFromTimeline(status: ProjectStatus): { status: ProjectStatus } {
  return { status };
}
