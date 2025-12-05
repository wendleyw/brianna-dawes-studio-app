/**
 * Centralized Briefing Field Constants
 *
 * Defines the structure and layout of project briefing forms.
 */

import type { ProjectBriefing } from '../../domain/board.types';

// ==================== BRIEFING FIELDS ====================

/** Briefing form fields configuration (3x3 grid) */
export const BRIEFING_FIELDS: Array<{
  key: keyof ProjectBriefing;
  label: string;
  col: number;
  row: number;
}> = [
  { key: 'projectOverview', label: 'Overview', col: 0, row: 0 },
  { key: 'targetAudience', label: 'Audience', col: 1, row: 0 },
  { key: 'goals', label: 'Goals', col: 2, row: 0 },
  { key: 'finalMessaging', label: 'Messaging', col: 0, row: 1 },
  { key: 'deliverables', label: 'Deliverables', col: 1, row: 1 },
  { key: 'resourceLinks', label: 'Resources', col: 2, row: 1 },
  { key: 'inspirations', label: 'Inspirations', col: 0, row: 2 },
  { key: 'styleNotes', label: 'Style', col: 1, row: 2 },
  { key: 'additionalNotes', label: 'Notes', col: 2, row: 2 },
] as const;

// ==================== DEFAULT VALUES ====================

/** Default empty briefing */
export const DEFAULT_BRIEFING: ProjectBriefing = {
  projectOverview: null,
  targetAudience: null,
  goals: null,
  finalMessaging: null,
  deliverables: null,
  resourceLinks: null,
  inspirations: null,
  styleNotes: null,
  timeline: null,
  additionalNotes: null,
};
