/**
 * Priority Configuration - Single source of truth for priority across the app
 *
 * Used in:
 * - ProjectCard badges
 * - NewProjectPage form
 * - ProjectDetailPage display
 * - Miro board cards
 * - Dashboard reports
 */

import type { ProjectPriority } from '@features/projects/domain/project.types';

// Priority column configuration
export interface PriorityColumn {
  id: ProjectPriority;
  label: string;
  color: string;
  description: string;
}

// The 4 priority levels - single source of truth
export const PRIORITY_COLUMNS: PriorityColumn[] = [
  { id: 'urgent', label: 'URGENT', color: 'var(--color-error)', description: 'Immediate attention required' },
  { id: 'high', label: 'HIGH', color: 'var(--priority-high)', description: 'High priority, needs attention soon' },
  { id: 'medium', label: 'MEDIUM', color: 'var(--color-accent-light)', description: 'Normal priority' },
  { id: 'low', label: 'STANDARD', color: 'var(--color-success)', description: 'Standard timeline' },
];

// Priority config as a record for quick lookup
export const PRIORITY_CONFIG: Record<ProjectPriority, { label: string; color: string }> = {
  urgent: { label: 'URGENT', color: 'var(--color-error)' },
  high: { label: 'HIGH', color: 'var(--priority-high)' },
  medium: { label: 'MEDIUM', color: 'var(--color-accent-light)' },
  low: { label: 'STANDARD', color: 'var(--color-success)' },
} as const;

// Just colors for quick access
export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  urgent: 'var(--color-error)',
  high: 'var(--priority-high)',
  medium: 'var(--color-accent-light)',
  low: 'var(--color-success)',
} as const;

// Priority options for forms (in order of urgency)
export const PRIORITY_OPTIONS = PRIORITY_COLUMNS.map(col => ({
  value: col.id,
  label: col.label,
  color: col.color,
}));
