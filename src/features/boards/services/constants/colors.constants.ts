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
  { id: 'overdue', label: 'OVERDUE', color: 'var(--priority-high)' },
  { id: 'urgent', label: 'URGENT', color: 'var(--color-error)' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'var(--color-accent-light)' },
  { id: 'review', label: 'REVIEW', color: 'var(--color-info)' },
  { id: 'done', label: 'DONE', color: 'var(--color-success)' },
] as const;

// ==================== PROJECT TYPE COLORS ====================

/** Colors and config for project types */
export const PROJECT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'social-post-design': { label: 'Social Post', color: 'var(--priority-high)', icon: '📱' },
  'email-design': { label: 'Email', color: 'var(--color-purple-600)', icon: '📧' },
  'hero-section': { label: 'Hero Section', color: 'var(--color-purple-700)', icon: '🖼️' },
  'ad-design': { label: 'Ad Design', color: 'var(--color-info)', icon: '📢' },
  'marketing-campaign': { label: 'Marketing', color: 'var(--color-accent-light)', icon: '📣' },
  'video-production': { label: 'Video', color: 'var(--color-accent)', icon: '🎬' },
  'gif-design': { label: 'GIF', color: 'var(--color-success)', icon: '✨' },
  'website-assets': { label: 'Web Assets', color: 'var(--color-success)', icon: '🧩' },
  'website-ui-design': { label: 'Website UI', color: 'var(--color-warning)', icon: '🌐' },
  'other': { label: 'Other', color: 'var(--color-gray-500)', icon: '📋' },
} as const;

// ==================== SYNC STATUS COLORS ====================

/** Colors for sync status indicators */
export const SYNC_STATUS_COLORS = {
  synced: 'var(--color-success)',     // Green - successfully synced
  pending: 'var(--color-warning)',    // Yellow - waiting to sync
  syncing: 'var(--color-accent-light)',    // Blue - currently syncing
  sync_error: 'var(--color-error)', // Red - sync failed
  unknown: 'var(--color-gray-500)',    // Gray - unknown/default
} as const;

/** Get color for a sync status */
export function getSyncStatusColor(status: string): string {
  return SYNC_STATUS_COLORS[status as keyof typeof SYNC_STATUS_COLORS] ?? SYNC_STATUS_COLORS.unknown;
}

// ==================== BADGE COLORS ====================

/** Colors used for status badges in UI */
export const BADGE_COLORS = {
  SUCCESS: 'var(--color-success)',    // Green - approved, done, success
  WARNING: 'var(--color-warning)',    // Yellow/amber - pending, warning
  ERROR: 'var(--color-error)',      // Red - error, urgent
  INFO: 'var(--color-accent-light)',       // Blue - in progress, info
  PURPLE: 'var(--color-purple-500)',     // Purple - reviewed, special
  NEUTRAL: 'var(--color-gray-700)',    // Gray - archived, neutral
} as const;

// ==================== UI COLORS ====================

/** Common UI colors */
export const UI_COLORS = {
  // Backgrounds
  BG_WHITE: 'var(--color-text-inverse)',
  BG_DARK: 'var(--color-primary)',
  BG_GRAY: 'var(--color-gray-100)',

  // Borders
  BORDER_LIGHT: 'var(--color-gray-200)',
  BORDER_DARK: 'var(--color-gray-700)',

  // Text
  TEXT_WHITE: 'var(--color-text-inverse)',
  TEXT_DARK: 'var(--color-gray-700)',
  TEXT_MUTED: 'var(--color-gray-500)',

  // Accent colors
  ACCENT_BLUE: 'var(--color-accent-light)',
  ACCENT_INDIGO: 'var(--color-info)',
  ACCENT_PURPLE: 'var(--color-purple-500)',
} as const;
