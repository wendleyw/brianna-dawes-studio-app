/**
 * Centralized Layout Constants for Miro Board Services
 *
 * All layout dimensions, spacing, and positioning values
 * should be defined here to ensure consistency across services.
 */

// ==================== FRAME SIZES ====================

/** Project frame dimensions (briefing and versions) */
export const FRAME = {
  WIDTH: 800,
  HEIGHT: 600,
  GAP: 30,           // Gap between frames horizontally
  ROW_GAP: 50,       // Gap between project rows vertically
} as const;

// ==================== TIMELINE LAYOUT ====================

/** Master Timeline frame and column configuration */
export const TIMELINE = {
  FRAME_WIDTH: 800,      // Increased to fit all 7 columns
  FRAME_HEIGHT: 500,
  COLUMN_WIDTH: 95,      // Wider columns for better readability
  COLUMN_HEIGHT: 380,
  COLUMN_GAP: 8,         // Slightly larger gap
  HEADER_HEIGHT: 28,
  TITLE_HEIGHT: 35,
  CARD_WIDTH: 88,        // Wider cards
  CARD_HEIGHT: 32,
  CARD_GAP: 12,          // Increased gap between cards for better spacing
  PADDING: 15,
  GAP_TO_PROJECTS: 50,  // Gap between timeline and projects
} as const;

// ==================== BRIEFING LAYOUT ====================

/** Briefing frame internal layout */
export const BRIEFING = {
  PADDING: 20,
  HEADER_HEIGHT: 50,
  FORM: {
    COLS: 3,
    ROWS: 3,
    CELL_WIDTH: 240,
    CELL_HEIGHT: 80,
    CELL_GAP: 10,
  },
  CREATIVE: {
    HEADER_HEIGHT: 35,
    PADDING: 15,
  },
} as const;

// ==================== TITLE STYLING ====================

/** Title text styling */
export const TITLE = {
  HEIGHT: 30,
  GAP: 10,
  FONT_SIZE: 18,
} as const;

// ==================== TEXT LIMITS ====================

/** Text truncation limits */
export const TEXT_LIMITS = {
  MAX_DISPLAY_LENGTH: 60,
  TRUNCATE_AT: 57,
} as const;

// ==================== TYPOGRAPHY ====================

/** Font sizes for different contexts */
export const FONT_SIZES = {
  TITLE: 18,
  HEADER: 13,
  BODY: 10,
  SMALL: 9,
  TINY: 8,
} as const;
