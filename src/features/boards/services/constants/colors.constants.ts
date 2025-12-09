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
  'social-post-design': { label: 'Social Post', color: '#E91E63', icon: '📱' },
  'email-design': { label: 'Email', color: '#9C27B0', icon: '📧' },
  'hero-section': { label: 'Hero Section', color: '#673AB7', icon: '🖼️' },
  'ad-design': { label: 'Ad Design', color: '#3F51B5', icon: '📢' },
  'marketing-campaign': { label: 'Marketing', color: '#2196F3', icon: '📣' },
  'video-production': { label: 'Video', color: '#00BCD4', icon: '🎬' },
  'gif-design': { label: 'GIF', color: '#009688', icon: '✨' },
  'website-assets': { label: 'Web Assets', color: '#4CAF50', icon: '🧩' },
  'website-ui-design': { label: 'Website UI', color: '#FF9800', icon: '🌐' },
  'other': { label: 'Other', color: '#607D8B', icon: '📋' },
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
