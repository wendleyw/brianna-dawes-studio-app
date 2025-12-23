/**
 * Timeline Status - Unified status system for the entire application
 *
 * These 5 statuses are used everywhere:
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

// The 5 status columns - single source of truth
// Order: Most urgent first, Done always at the end for proper filtering/display
export const STATUS_COLUMNS: StatusColumn[] = [
  { id: 'overdue', label: 'OVERDUE', color: 'var(--priority-high)', description: 'Past due date' },
  { id: 'urgent', label: 'URGENT', color: 'var(--color-error)', description: 'High priority, deadline approaching' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#60A5FA', description: 'Actively being worked on' },
  { id: 'review', label: 'REVIEW', color: '#1E3A8A', description: 'Awaiting client review/approval' },
  { id: 'done', label: 'DONE', color: 'var(--color-success)', description: 'Completed' },
];

// Backward compatibility: TIMELINE_COLUMNS is an alias for STATUS_COLUMNS
export const TIMELINE_COLUMNS = STATUS_COLUMNS;
export type TimelineColumn = StatusColumn;

// Default column (in_progress) - index 2 in the 5-status array
const DEFAULT_COLUMN: StatusColumn = STATUS_COLUMNS[2]!;

// Get status column by ID
export function getStatusColumn(status: ProjectStatus): StatusColumn {
  return STATUS_COLUMNS.find(col => col.id === status) ?? DEFAULT_COLUMN;
}

// Get status directly from project (no derivation needed anymore!)
export function getTimelineStatus(project: {
  status: ProjectStatus;
  dueDate?: string | null;
  dueDateApproved?: boolean;
}): ProjectStatus {
  if (project.status === 'done') return 'done';

  // Overdue takes precedence when due date is approved and in the past
  if (project.dueDate && project.dueDateApproved !== false) {
    const due = new Date(project.dueDate);
    if (!Number.isNaN(due.getTime())) {
      // If date-only, treat as end-of-day local time
      if (/^\d{4}-\d{2}-\d{2}$/.test(project.dueDate)) {
        due.setHours(23, 59, 59, 999);
      }
      if (due.getTime() < Date.now()) return 'overdue';
    }
  }

  return project.status;
}

/**
 * Get progress percentage based on project status
 *
 * Progress represents how far along in the workflow the project is:
 * - overdue/urgent: Early stages, high priority work needed (25%)
 * - in_progress: Actively being worked on (50%)
 * - review: Awaiting client approval (75%)
 * - done: Completed and approved (100%)
 */
export const STATUS_PROGRESS: Record<ProjectStatus, number> = {
  'overdue': 25,      // Behind schedule but still in progress
  'urgent': 25,       // High priority, early/mid stage
  'in_progress': 50,  // Actively being worked on
  'review': 75,       // Awaiting client review/approval
  'done': 100,        // Completed
};

export function getStatusProgress(status: ProjectStatus): number {
  return STATUS_PROGRESS[status] ?? 50;
}
