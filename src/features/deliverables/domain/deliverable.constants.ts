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
  { value: 'revision' as DeliverableType, label: 'Revision', description: 'Updates & changes' },
  { value: 'final' as DeliverableType, label: 'Final', description: 'Ready to deliver' },
] as const;

/** Deliverable status options for forms and filters */
export const DELIVERABLE_STATUSES = [
  { value: 'in_review' as DeliverableStatus, label: 'Review' },
  { value: 'delivered' as DeliverableStatus, label: 'Delivered' },
] as const;

/** Status colors for visual indicators */
export const DELIVERABLE_STATUS_COLORS: Record<DeliverableStatus, string> = {
  draft: 'var(--color-gray-500)',      // Gray
  in_progress: 'var(--color-accent-light)', // Blue
  in_review: 'var(--color-warning)',   // Yellow
  approved: 'var(--color-success)',    // Green
  rejected: 'var(--color-error)',    // Red
  delivered: 'var(--color-success)',   // Emerald
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
  type: 'concept',
  version: '1',
  count: 1,
  bonusCount: 0,
  hoursSpent: 0,
  status: 'in_review',
  notes: '',
  externalUrl: '',
  miroUrl: '',
};
