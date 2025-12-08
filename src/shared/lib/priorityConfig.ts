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
  { id: 'urgent', label: 'URGENT', color: '#050038', description: 'Immediate attention required' },
  { id: 'high', label: 'HIGH', color: '#050038', description: 'High priority, needs attention soon' },
  { id: 'medium', label: 'MEDIUM', color: '#050038', description: 'Normal priority' },
  { id: 'low', label: 'STANDARD', color: '#050038', description: 'Standard timeline' },
];

// Priority config as a record for quick lookup
export const PRIORITY_CONFIG: Record<ProjectPriority, { label: string; color: string }> = {
  urgent: { label: 'URGENT', color: '#050038' },
  high: { label: 'HIGH', color: '#050038' },
  medium: { label: 'MEDIUM', color: '#050038' },
  low: { label: 'STANDARD', color: '#050038' },
} as const;

// Just colors for quick access
export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  urgent: '#050038',
  high: '#050038',
  medium: '#050038',
  low: '#050038',
} as const;

// Get priority column by ID
export function getPriorityColumn(priority: ProjectPriority): PriorityColumn {
  return PRIORITY_COLUMNS.find(col => col.id === priority) ?? PRIORITY_COLUMNS[3]!;
}

// Get badge variant for priority
export function getPriorityVariant(priority: ProjectPriority): 'error' | 'warning' | 'info' | 'success' {
  switch (priority) {
    case 'urgent':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    default:
      return 'info';
  }
}

// Priority options for forms (in order of urgency)
export const PRIORITY_OPTIONS = PRIORITY_COLUMNS.map(col => ({
  value: col.id,
  label: col.label,
  color: col.color,
}));
