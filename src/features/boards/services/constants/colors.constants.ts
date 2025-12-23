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
  { id: 'overdue', label: 'OVERDUE', color: '#F59E0B' },
  { id: 'urgent', label: 'URGENT', color: '#EF4444' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#60A5FA' },
  { id: 'review', label: 'REVIEW', color: '#3B82F6' },
  { id: 'done', label: 'DONE', color: '#10B981' },
] as const;

// ==================== PROJECT TYPE COLORS ====================

/** Colors and config for project types */
export const PROJECT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'social-post-design': { label: 'Social Post', color: '#F59E0B', icon: '📱' },
  'email-design': { label: 'Email', color: '#7C3AED', icon: '📧' },
  'hero-section': { label: 'Hero Section', color: '#6D28D9', icon: '🖼️' },
  'ad-design': { label: 'Ad Design', color: '#60A5FA', icon: '📢' },
  'marketing-campaign': { label: 'Marketing', color: '#60A5FA', icon: '📣' },
  'video-production': { label: 'Video', color: '#2563EB', icon: '🎬' },
  'gif-design': { label: 'GIF', color: '#10B981', icon: '✨' },
  'website-assets': { label: 'Web Assets', color: '#10B981', icon: '🧩' },
  'website-ui-design': { label: 'Website UI', color: '#F59E0B', icon: '🌐' },
  'other': { label: 'Other', color: '#6B7280', icon: '📋' },
} as const;

// ==================== SYNC STATUS COLORS ====================

/** Colors for sync status indicators */
export const SYNC_STATUS_COLORS = {
  synced: '#10B981',     // Green - successfully synced
  pending: '#F59E0B',    // Yellow - waiting to sync
  syncing: '#60A5FA',    // Blue - currently syncing
  sync_error: '#EF4444', // Red - sync failed
  unknown: '#6B7280',    // Gray - unknown/default
} as const;

/** Get color for a sync status */
export function getSyncStatusColor(status: string): string {
  return SYNC_STATUS_COLORS[status as keyof typeof SYNC_STATUS_COLORS] ?? SYNC_STATUS_COLORS.unknown;
}

// ==================== BADGE COLORS ====================

/** Colors used for status badges in UI */
export const BADGE_COLORS = {
  SUCCESS: '#10B981',    // Green - approved, done, success
  WARNING: '#F59E0B',    // Yellow/amber - pending, warning
  ERROR: '#EF4444',      // Red - error, urgent
  INFO: '#60A5FA',       // Blue - in progress, info
  PURPLE: '#8B5CF6',     // Purple - reviewed, special
  NEUTRAL: '#374151',    // Gray - archived, neutral
} as const;

// ==================== UI COLORS ====================

/** Common UI colors */
export const UI_COLORS = {
  // Backgrounds
  BG_WHITE: '#FFFFFF',
  BG_DARK: '#050038',
  BG_GRAY: '#F3F4F6',

  // Borders
  BORDER_LIGHT: '#E5E7EB',
  BORDER_DARK: '#374151',

  // Text
  TEXT_WHITE: '#FFFFFF',
  TEXT_DARK: '#374151',
  TEXT_MUTED: '#6B7280',

  // Accent colors
  ACCENT_BLUE: '#60A5FA',
  ACCENT_INDIGO: '#60A5FA',
  ACCENT_PURPLE: '#8B5CF6',
} as const;
