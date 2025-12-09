/**
 * Deliverable Constants
 *
 * Centralized configuration for deliverable types and statuses.
 * Use these constants for UI rendering and form options.
 */

import type { DeliverableType, DeliverableStatus } from './deliverable.types';

/** Deliverable type options for forms and filters */
export const DELIVERABLE_TYPES = [
  { value: 'concept' as DeliverableType, label: 'Concept', description: 'Initial ideas' },
  { value: 'design' as DeliverableType, label: 'Design', description: 'Main design work' },
  { value: 'revision' as DeliverableType, label: 'Revision', description: 'Updates & changes' },
  { value: 'final' as DeliverableType, label: 'Final', description: 'Ready to deliver' },
] as const;

/** Deliverable status options for forms and filters */
export const DELIVERABLE_STATUSES = [
  { value: 'draft' as DeliverableStatus, label: 'Draft' },
  { value: 'in_progress' as DeliverableStatus, label: 'In Progress' },
  { value: 'in_review' as DeliverableStatus, label: 'In Review' },
  { value: 'approved' as DeliverableStatus, label: 'Approved' },
  { value: 'delivered' as DeliverableStatus, label: 'Delivered' },
] as const;

/** Status colors for visual indicators */
export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  draft: '#6B7280',      // Gray
  in_progress: '#3B82F6', // Blue
  in_review: '#F59E0B',   // Yellow
  approved: '#22C55E',    // Green
  rejected: '#EF4444',    // Red
  delivered: '#10B981',   // Emerald
};

/** Get color for a deliverable status */
export function getDeliverableStatusColor(status: DeliverableStatus): string {
  return DELIVERABLE_STATUS_COLORS[status] || DELIVERABLE_STATUS_COLORS.draft;
}

/** Default deliverable form values - for use in useState */
export const DEFAULT_DELIVERABLE_FORM: {
  name: string;
  type: DeliverableType;
  version: string;
  count: number;
  bonusCount: number;
  hoursSpent: number;
  status: DeliverableStatus;
  notes: string;
  externalUrl: string;
  miroUrl: string;
} = {
  name: '',
  type: 'design',
  version: '1.0',
  count: 1,
  bonusCount: 0,
  hoursSpent: 0,
  status: 'in_progress',
  notes: '',
  externalUrl: '',
  miroUrl: '',
};
