/**
 * Centralized Color Constants for Miro Board Services
 *
 * All color values should be defined here to ensure
 * visual consistency across all board elements.
 */

import type { ProjectPriority } from '@features/projects/domain/project.types';
import type { TimelineStatus } from '../../domain/board.types';

// ==================== PRIORITY COLORS ====================

/** Colors for project priority badges */
export const PRIORITY_COLORS: Record<ProjectPriority, string> = {
  urgent: '#EF4444',   // Red
  high: '#F97316',     // Orange
  medium: '#F59E0B',   // Yellow/Amber (matches form)
  low: '#10B981',      // Green (matches form)
} as const;

// ==================== TIMELINE STATUS COLORS ====================

/** Timeline column configuration with colors - unified 7-status system */
export const TIMELINE_COLUMNS: Array<{
  id: TimelineStatus;
  title: string;
  color: string;
}> = [
  { id: 'critical', title: 'CRITICAL', color: '#EF4444' },
  { id: 'overdue', title: 'OVERDUE', color: '#F97316' },
  { id: 'urgent', title: 'URGENT', color: '#EAB308' },
  { id: 'on_track', title: 'ON TRACK', color: '#3B82F6' },
  { id: 'in_progress', title: 'IN PROGRESS', color: '#8B5CF6' },
  { id: 'review', title: 'REVIEW', color: '#6366F1' },
  { id: 'done', title: 'DONE', color: '#22C55E' },
] as const;

// ==================== PROJECT TYPE COLORS ====================

/** Colors and config for project types */
export const PROJECT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'website-ui-design': { label: 'Website UI', color: '#3B82F6', icon: '🌐' },
  'marketing-campaign': { label: 'Marketing', color: '#8B5CF6', icon: '📣' },
  'video-production': { label: 'Video', color: '#EF4444', icon: '🎬' },
  'email-design': { label: 'Email', color: '#10B981', icon: '📧' },
  'social-post-carousel': { label: 'Social Post', color: '#F59E0B', icon: '📱' },
} as const;

// ==================== UI COLORS ====================

/** Common UI colors */
export const UI_COLORS = {
  // Backgrounds
  BG_WHITE: '#FFFFFF',
  BG_DARK: '#1F2937',
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
