/**
 * Centralized Color Constants for Miro Board Services
 *
 * All color values should be defined here to ensure
 * visual consistency across all board elements.
 */

import type { TimelineStatus } from '../../domain/board.types';

// ==================== PRIORITY COLORS ====================

// Re-export from centralized priorityConfig for consistency
export { PRIORITY_COLORS, PRIORITY_CONFIG } from '@shared/lib/priorityConfig';

// ==================== TIMELINE STATUS COLORS ====================

/**
 * Timeline column configuration with colors - unified 5-status system
 * Uses 'label' property to match timelineStatus.ts single source of truth
 */
export const TIMELINE_COLUMNS: Array<{
  id: TimelineStatus;
  label: string;
  color: string;
}> = [
  { id: 'overdue', label: 'OVERDUE', color: '#F97316' },
  { id: 'urgent', label: 'URGENT', color: '#DC2626' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#3B82F6' },
  { id: 'review', label: 'REVIEW', color: '#6366F1' },
  { id: 'done', label: 'DONE', color: '#22C55E' },
] as const;

// ==================== PROJECT TYPE COLORS ====================

/** Colors and config for project types */
export const PROJECT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'website-ui-design': { label: 'Website UI', color: '#000000', icon: '🌐' },
  'marketing-campaign': { label: 'Marketing', color: '#000000', icon: '📣' },
  'video-production': { label: 'Video', color: '#000000', icon: '🎬' },
  'email-design': { label: 'Email', color: '#000000', icon: '📧' },
  'social-post-carousel': { label: 'Social Post', color: '#000000', icon: '📱' },
} as const;

// ==================== UI COLORS ====================

/** Common UI colors */
export const UI_COLORS = {
  // Backgrounds
  BG_WHITE: '#FFFFFF',
  BG_DARK: '#000000',
  BG_GRAY: '#F3F4F6',

  // Borders
  BORDER_LIGHT: '#E5E7EB',
  BORDER_DARK: '#374151',

  // Text
  TEXT_WHITE: '#FFFFFF',
  TEXT_DARK: '#374151',
  TEXT_MUTED: '#6B7280',

  // Accent colors
  ACCENT_BLUE: '#3B82F6',
  ACCENT_INDIGO: '#6366F1',
  ACCENT_PURPLE: '#8B5CF6',
} as const;
