/**
 * Miro SDK v2 Service
 *
 * LAYOUT: Timeline Master on LEFT, Projects on RIGHT (side by side)
 *
 * ┌─────────────────────────────┐     ┌────────────────────┬────────────────────┐
 * │ ⭐ MASTER PROJECT TIMELINE  │     │  Project 1         │  Project 1         │
 * │                             │     │  BRIEFING          │  VERSION 1         │
 * │ ┌─────┬─────┬─────┬─────┐  │     └────────────────────┴────────────────────┘
 * │ │CRIT │OVER │URG  │ON   │  │
 * │ ├─────┼─────┼─────┼─────┤  │     ┌────────────────────┬────────────────────┐
 * │ │PROG │REV  │DONE │     │  │     │  Project 2         │  Project 2         │
 * │ └─────┴─────┴─────┴─────┘  │     │  BRIEFING          │  VERSION 1         │
 * │                             │     └────────────────────┴────────────────────┘
 * │  ┌─────────────────────┐   │
 * │  │ Project Card        │   │     ┌────────────────────┬────────────────────┐
 * │  │ Project Card        │   │     │  Project 3         │  Project 3         │
 * │  └─────────────────────┘   │     │  BRIEFING          │  VERSION 1         │
 * │                             │     └────────────────────┴────────────────────┘
 * └─────────────────────────────┘
 *        Timeline Master                   Projects Details
 */
import type {
  TimelineColumn,
  TimelineCard,
  MasterTimelineState,
  ProjectBriefing,
  ProjectRowState,
} from '../domain/board.types';
import type { Project, ProjectStatus } from '@features/projects/domain/project.types';
import type { MiroFrame, MiroCard, MiroItem } from '../context/MiroContext';

// Import centralized constants
import {
  FRAME,
  TIMELINE,
  BRIEFING,
  TITLE,
  PRIORITY_COLORS,
  TIMELINE_COLUMNS,
  BRIEFING_FIELDS,
} from './constants';
import { getProjectTypeFromBriefing } from './miroHelpers';
import { createLogger } from '@shared/lib/logger';
import { getDaysEarly, formatDateShort } from '@shared/lib/dateFormat';
import { miroAdapter } from '@shared/lib/miroAdapter';
import { registerMiroItem } from './miroItemRegistry';

// Create namespaced loggers for different services
const timelineLogger = createLogger('MiroTimeline');
const projectLogger = createLogger('MiroProject');

// ==================== HELPER FUNCTIONS ====================

const MIRO_COLOR_FALLBACKS: Record<string, string> = {
  '--color-error': '#EF4444',
  '--color-warning': '#F59E0B',
  '--color-success': '#10B981',
  '--color-info': '#3B82F6',
  '--color-accent-light': '#60A5FA',
  '--status-in-progress': '#60A5FA',
  '--status-review': '#1E3A8A',
  '--priority-high': '#F59E0B',
  '--priority-urgent': '#EF4444',
  '--priority-medium': '#60A5FA',
  '--priority-standard': '#10B981',
};

function normalizeMiroColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  let candidate = value.trim();

  if (candidate.startsWith('var(')) {
    const match = candidate.match(/^var\((--[^, )]+)(?:,\s*([^)]+))?\)$/);
    if (match) {
      const varName = match[1];
      if (!varName) return fallback;
      const cssFallback = match[2]?.trim();
      const resolved =
        typeof document !== 'undefined'
          ? getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
          : '';
      candidate = resolved || cssFallback || MIRO_COLOR_FALLBACKS[varName] || fallback;
    }
  }

  if (/^#([0-9a-fA-F]{6})$/.test(candidate)) return candidate;
  if (/^#([0-9a-fA-F]{3})$/.test(candidate)) {
    const hex = candidate.slice(1).split('').map((c) => c + c).join('');
    return `#${hex}`;
  }

  const rgbMatch = candidate.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const parts = rgbMatch[1]?.split(',').map((p) => p.trim()) ?? [];
    if (parts.length >= 3) {
      const rgb = parts.slice(0, 3).map((p) => Number.parseInt(p, 10));
      if (rgb.length === 3 && rgb.every((n) => Number.isFinite(n))) {
        return `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
      }
    }
  }

  return fallback;
}

function stripHtml(value?: string): string {
  return value?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().toUpperCase() ?? '';
}

/** Prefixed logger for Miro services - uses unified logger */
function log(prefix: string, message: string, data?: unknown): void {
  const logger = prefix === 'MiroTimeline' ? timelineLogger : projectLogger;
  logger.debug(message, data);
}

/**
 * Get Miro SDK instance
 * Uses the unified miroAdapter for consistent access
 */
function getMiroSDK() {
  return miroAdapter.getSDK();
}

/**
 * Normalize date to YYYY-MM-DD format required by Miro SDK.
 * Accepts ISO strings, timestamps, and various formats.
 */
function normalizeDateToYYYYMMDD(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return undefined;
  }
}

/**
 * Find timeline frame on the board by:
 * 1. Looking for "Timeline Master" text nearby (title is created as separate text)
 * 2. Finding frame with empty title at fixed position (0, 0)
 * 3. Finding frame by dimensions (as fallback)
 */
async function findTimelineFrame(): Promise<MiroFrame | null> {
  const miro = getMiroSDK();
  const existingFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];

  // Strategy 1: Find frame with title containing "MASTER TIMELINE" or "Timeline Master"
  let timelineFrame = existingFrames.find(f =>
    f.title?.includes('MASTER TIMELINE') ||
    f.title?.includes('Timeline Master')
  );

  if (timelineFrame) {
    log('MiroTimeline', 'Found timeline frame by title', timelineFrame.id);
    return timelineFrame;
  }

  // Strategy 2: Look for "Timeline Master" text and find the frame below it
  try {
    const allTexts = await miro.board.get({ type: 'text' }) as Array<{ content?: string; x: number; y: number }>;
    const timelineTitleText = allTexts.find(t =>
      t.content?.includes('Timeline Master') || t.content?.includes('MASTER TIMELINE')
    );

    if (timelineTitleText) {
      const candidates = existingFrames
        .filter(f => {
          const xMatch = Math.abs(f.x - timelineTitleText.x) < 200; // Title is offset to the left
          const isEmptyTitle = !f.title || f.title === '';
          const frameTop = f.y - (f.height || TIMELINE.FRAME_HEIGHT) / 2;
          const belowTitle = frameTop > timelineTitleText.y;
          return xMatch && belowTitle && isEmptyTitle;
        })
        .map(f => {
          const frameTop = f.y - (f.height || TIMELINE.FRAME_HEIGHT) / 2;
          return { frame: f, distance: frameTop - timelineTitleText.y };
        })
        .sort((a, b) => a.distance - b.distance);

      if (candidates.length > 0 && candidates[0]) {
        timelineFrame = candidates[0].frame;
      }

      if (timelineFrame) {
        log('MiroTimeline', 'Found timeline frame by nearby title text', timelineFrame.id);
        return timelineFrame;
      }
    }
  } catch (e) {
    log('MiroTimeline', 'Error searching for timeline title text', e);
  }

  // Strategy 3: Find frame containing timeline header shapes (OVERDUE..DONE)
  try {
    const headerLabels = new Set(['OVERDUE', 'URGENT', 'IN PROGRESS', 'REVIEW', 'DONE']);
    const shapes = await miro.board.get({ type: 'shape' }) as Array<{
      content?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      shape?: string;
    }>;
    const headerShapes = shapes.filter((shape) => {
      const label = stripHtml(shape.content);
      const isHeader = headerLabels.has(label);
      const isHeaderSize =
        shape.width >= TIMELINE.COLUMN_WIDTH - 60 &&
        shape.width <= TIMELINE.COLUMN_WIDTH + 60 &&
        shape.height >= TIMELINE.HEADER_HEIGHT - 8 &&
        shape.height <= TIMELINE.HEADER_HEIGHT + 8;
      return isHeader && isHeaderSize;
    });

    if (headerShapes.length > 0) {
      const frameCandidates = existingFrames
        .filter(f => !f.title || f.title === '')
        .map(f => {
          const width = f.width || TIMELINE.FRAME_WIDTH;
          const height = f.height || TIMELINE.FRAME_HEIGHT;
          const left = f.x - width / 2;
          const right = f.x + width / 2;
          const top = f.y - height / 2;
          const bottom = f.y + height / 2;
          const count = headerShapes.filter(h =>
            h.x >= left && h.x <= right && h.y >= top && h.y <= bottom
          ).length;
          return { frame: f, count, widthDelta: Math.abs(width - TIMELINE.FRAME_WIDTH) };
        })
        .filter(c => c.count > 0)
        .sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return a.widthDelta - b.widthDelta;
        });

      if (frameCandidates.length > 0 && frameCandidates[0]) {
        timelineFrame = frameCandidates[0].frame;
        log('MiroTimeline', 'Found timeline frame by header shapes', timelineFrame.id);
        return timelineFrame;
      }
    }
  } catch (e) {
    log('MiroTimeline', 'Error searching for timeline header shapes', e);
  }

  // Strategy 4: Find frame at fixed position (0, 0) with empty title
  // Timeline is always created at origin with empty title
  timelineFrame = existingFrames.find(f => {
    const isAtOrigin = Math.abs(f.x) < 100 && Math.abs(f.y) < 200;
    const isEmptyTitle = !f.title || f.title === '';
    // Check it's roughly timeline-sized (width should be close to TIMELINE.FRAME_WIDTH)
    const isTimelineWidth = f.width && Math.abs(f.width - TIMELINE.FRAME_WIDTH) < 50;
    return isAtOrigin && isEmptyTitle && isTimelineWidth;
  });

  if (timelineFrame) {
    log('MiroTimeline', 'Found timeline frame at origin position', timelineFrame.id);
    return timelineFrame;
  }

  // Strategy 5: Find by dimensions alone (less reliable, frame may have been resized)
  timelineFrame = existingFrames.find(f =>
    f.width && f.height &&
    Math.abs(f.width - TIMELINE.FRAME_WIDTH) < 50 &&
    !f.title // Must have no title (timeline frames have empty title)
  );

  if (timelineFrame) {
    log('MiroTimeline', 'Found timeline frame by dimensions', timelineFrame.id);
    return timelineFrame;
  }

  return null;
}

/**
 * Safely remove a Miro board item by ID (with error handling)
 * Uses the unified miroAdapter for consistent error handling
 */
async function safeRemove(id: string): Promise<boolean> {
  return miroAdapter.removeItem(id);
}

// Map project status to timeline status (overdue derived from dueDate when applicable)
function getTimelineStatus(project: { status: ProjectStatus; dueDate?: string | null; dueDateApproved?: boolean }): ProjectStatus {
  if (project.status === 'done') return 'done';

  if (project.dueDate && project.dueDateApproved !== false) {
    const due = new Date(project.dueDate);
    if (!Number.isNaN(due.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(project.dueDate)) {
        due.setHours(23, 59, 59, 999);
      }
      if (due.getTime() < Date.now()) return 'overdue';
    }
  }

  return project.status;
}

// Get status color from timeline columns configuration
function getStatusConfig(status: ProjectStatus): { label: string; color: string } {
  const column = TIMELINE_COLUMNS.find(c => c.id === status);
  if (column) {
    return { label: column.label, color: normalizeMiroColor(column.color, '#6B7280') };
  }
  // Default fallback
  return { label: status.toUpperCase().replace('_', ' '), color: '#6B7280' };
}

// getProjectTypeFromBriefing is now imported from miroHelpers

// ==================== MASTER TIMELINE SERVICE (LEFT SIDE) ====================

class MiroMasterTimelineService {
  private state: MasterTimelineState | null = null;
  private frameCenterX: number = 0;
  private frameCenterY: number = 0;
  private initialized: boolean = false;
  // Track projects currently being synced to prevent concurrent syncs
  private syncingProjects: Set<string> = new Set();
  // Global sync lock to prevent race conditions when multiple projects sync concurrently
  private syncLock: Promise<void> = Promise.resolve();
  private static readonly FILES_CHAT_COLUMN = {
    label: 'Files / Chat',
    color: '#000000',
  } as const;

  private refreshColumnColors(): void {
    if (!this.state) return;

    this.state.columns = this.state.columns.map((col) => {
      const config = TIMELINE_COLUMNS.find((c) => c.id === col.id);
      if (!config) return col;
      return {
        ...col,
        label: config.label,
        color: normalizeMiroColor(config.color, '#6B7280'),
      };
    });
  }

  private async updateTimelineHeaderColors(frame: MiroFrame): Promise<void> {
    const miro = getMiroSDK();
    const frameWidth = frame.width ?? TIMELINE.FRAME_WIDTH;
    const frameHeight = frame.height ?? TIMELINE.FRAME_HEIGHT;
    const frameLeft = frame.x - frameWidth / 2;
    const frameRight = frame.x + frameWidth / 2;
    const frameTop = frame.y - frameHeight / 2;
    const frameBottom = frame.y + frameHeight / 2;

    const labelToColor = new Map(
      TIMELINE_COLUMNS.map((col) => [col.label, normalizeMiroColor(col.color, '#6B7280')])
    );

    const shapes = await miro.board.get({ type: 'shape' }) as Array<MiroItem & {
      style?: { fillColor?: string };
    }>;

    const headerShapes = shapes.filter((shape) => {
      const label = stripHtml(shape.content);
      if (!labelToColor.has(label)) return false;
      const width = shape.width ?? 0;
      const height = shape.height ?? 0;
      const isHeaderSize =
        width >= TIMELINE.COLUMN_WIDTH - 60 &&
        width <= TIMELINE.COLUMN_WIDTH + 60 &&
        height >= TIMELINE.HEADER_HEIGHT - 8 &&
        height <= TIMELINE.HEADER_HEIGHT + 8;
      const inFrame =
        shape.x >= frameLeft &&
        shape.x <= frameRight &&
        shape.y >= frameTop &&
        shape.y <= frameBottom;
      return isHeaderSize && inFrame;
    });

    let updated = 0;
    for (const shape of headerShapes) {
      const label = stripHtml(shape.content);
      const color = labelToColor.get(label);
      if (!color) continue;
      if (shape.style?.fillColor === color) continue;
      shape.style = { ...(shape.style || {}), fillColor: color };
      await miro.board.sync(shape);
      updated += 1;
    }

    if (updated > 0) {
      log('MiroTimeline', 'Updated timeline header colors', { updated });
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.state !== null;
  }

  async initializeTimeline(): Promise<MasterTimelineState> {
    // SINGLETON: Return existing if initialized in memory
    if (this.initialized && this.state && this.state.frameId) {
      const miro = getMiroSDK();
      try {
        log('MiroTimeline', '🔵 Singleton check: trying to ensure Files/Chat on cached timeline', { frameId: this.state.frameId });
        const frame = await miro.board.getById(this.state.frameId!) as MiroFrame | null;
        if (frame) {
          this.refreshColumnColors();
          const frameWidth = frame.width ?? TIMELINE.FRAME_WIDTH;
          const frameHeight = frame.height ?? TIMELINE.FRAME_HEIGHT;
          const frameLeft = frame.x - frameWidth / 2;
          const frameTop = frame.y - frameHeight / 2;
          log('MiroTimeline', '🔵 Frame found, calling ensureFilesChatColumn...', { frameWidth, frameHeight, frameLeft, frameTop });
          await this.ensureFilesChatColumn({ frameLeft, frameTop, frameWidth, frameHeight });
          await this.updateTimelineHeaderColors(frame);
          log('MiroTimeline', '✅ Files/Chat column ensured successfully on cached timeline');
        } else {
          log('MiroTimeline', '⚠️ Frame not found by ID, skipping Files/Chat column', { frameId: this.state.frameId });
        }
      } catch (error) {
        log('MiroTimeline', '❌ ERROR ensuring Files/Chat column on cached timeline', error);
        // Re-throw so we can see the error in console
        console.error('[MiroTimeline] Failed to ensure Files/Chat column:', error);
      }
      log('MiroTimeline', 'Already initialized in memory, reusing');
      return this.state;
    }

    const miro = getMiroSDK();

    // Check if timeline already exists on the board
    const existingTimeline = await findTimelineFrame();

    if (existingTimeline) {
      log('MiroTimeline', 'Found existing timeline on board', existingTimeline.id);

      // Restore state from existing timeline - use CURRENT position from board
      this.frameCenterX = existingTimeline.x;
      // IMPORTANT: frameCenterY should be the actual frame center, accounting for any expansion
      // The frame height may have changed, but we store the CURRENT center
      this.frameCenterY = existingTimeline.y;

      log('MiroTimeline', 'Frame position restored', {
        x: this.frameCenterX,
        y: this.frameCenterY,
        width: existingTimeline.width,
        height: existingTimeline.height
      });

      // Create column state - recalculate based on current frame position and actual height
      const columns: TimelineColumn[] = this.calculateColumnPositions(existingTimeline.height);

      this.state = {
        frameId: existingTimeline.id,
        columns,
        cards: [],
        lastSyncAt: new Date().toISOString(),
      };

      const frameWidth = existingTimeline.width ?? TIMELINE.FRAME_WIDTH;
      const frameHeight = existingTimeline.height ?? TIMELINE.FRAME_HEIGHT;
      const frameLeft = existingTimeline.x - frameWidth / 2;
      const frameTop = existingTimeline.y - frameHeight / 2;
      await this.ensureFilesChatColumn({ frameLeft, frameTop, frameWidth, frameHeight });
      this.refreshColumnColors();
      await this.updateTimelineHeaderColors(existingTimeline);

      this.initialized = true;
      await miro.board.viewport.zoomTo([existingTimeline]);
      return this.state;
    }

    // No existing timeline, create new one
    // Use FIXED position (origin-based) so timeline is always in the same place
    const FIXED_TIMELINE_X = 0;  // Center at origin X
    const FIXED_TIMELINE_Y = 0;  // Center at origin Y

    this.frameCenterX = FIXED_TIMELINE_X;
    this.frameCenterY = FIXED_TIMELINE_Y;

    log('MiroTimeline', 'Creating timeline on LEFT', { x: this.frameCenterX, y: this.frameCenterY });

    // Create "Timeline Master" title ABOVE the frame
    const frameTop = this.frameCenterY - TIMELINE.FRAME_HEIGHT / 2;
    const frameLeft = this.frameCenterX - TIMELINE.FRAME_WIDTH / 2;
    const titleY = frameTop - TITLE.GAP - TITLE.HEIGHT / 2;

    await miro.board.createText({
      content: '<b>Timeline Master</b>',
      x: frameLeft + 100,
      y: titleY,
      width: 200,
      style: {
        fontSize: TITLE.FONT_SIZE,
        textAlign: 'left',
      },
    });

    // Create warning message beside the title (avoid being covered by status header)
    await miro.board.createText({
      content: '<i>⚠️ Auto-updated - Do not edit manually</i>',
      x: frameLeft + 560,
      y: titleY,
      width: 760,
      style: {
        fontSize: 12,
        textAlign: 'left',
        color: '#6B7280', // Gray color
      },
    });

    // Create timeline frame with proper title for identification
    // Note: Miro SDK doesn't support locking frames programmatically,
    // but users can manually lock via right-click > Lock
    const frame = await miro.board.createFrame({
      title: 'MASTER TIMELINE',
      x: this.frameCenterX,
      y: this.frameCenterY,
      width: TIMELINE.FRAME_WIDTH,
      height: TIMELINE.FRAME_HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    // Status columns - ALL 7 in ONE horizontal row (no internal title)
    const columns: TimelineColumn[] = [];
    const startX = frameLeft + TIMELINE.PADDING;
    const statusHeaderY = frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT / 2;
    const dropZoneTopY = statusHeaderY + TIMELINE.HEADER_HEIGHT / 2 + 5;
    const dropY = dropZoneTopY + TIMELINE.COLUMN_HEIGHT / 2;

    // All 7 columns in one row
    for (let i = 0; i < TIMELINE_COLUMNS.length; i++) {
      const col = TIMELINE_COLUMNS[i];
      if (!col) continue;

      const colX = startX + TIMELINE.COLUMN_WIDTH / 2 + i * (TIMELINE.COLUMN_WIDTH + TIMELINE.COLUMN_GAP);
      const columnColor = normalizeMiroColor(col.color, '#6B7280');

      // Header with color (no border)
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>${col.label}</b></p>`,
        x: colX,
        y: statusHeaderY,
        width: TIMELINE.COLUMN_WIDTH,
        height: TIMELINE.HEADER_HEIGHT,
        style: {
          fillColor: columnColor,
          borderWidth: 0,
          color: '#FFFFFF',
          fontSize: 8,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });

      // Drop zone (white with gray border) - TALL to fit many cards
      await miro.board.createShape({
        shape: 'rectangle',
        content: '',
        x: colX,
        y: dropY,
        width: TIMELINE.COLUMN_WIDTH,
        height: TIMELINE.COLUMN_HEIGHT,
        style: {
          fillColor: '#FFFFFF',
          borderColor: '#E5E7EB',
          borderWidth: 1,
        },
      });

      columns.push({
        id: col.id,
        label: col.label,
        color: columnColor,
        x: colX,
        y: dropZoneTopY, // Store TOP of drop zone for card placement
        width: TIMELINE.COLUMN_WIDTH,
      });
    }

    await this.ensureFilesChatColumn({
      frameLeft,
      frameTop,
      frameWidth: TIMELINE.FRAME_WIDTH,
      frameHeight: TIMELINE.FRAME_HEIGHT,
    });

    this.state = {
      frameId: frame.id,
      columns,
      cards: [],
      lastSyncAt: new Date().toISOString(),
    };

    this.initialized = true;
    await miro.board.viewport.zoomTo([frame]);
    log('MiroTimeline', 'Initialized successfully');

    return this.state;
  }

  /**
   * Calculate column positions for existing timeline (single row, no internal title)
   * Uses stored frame height if available to calculate correct frameTop
   */
  private calculateColumnPositions(actualFrameHeight?: number): TimelineColumn[] {
    const frameLeft = this.frameCenterX - TIMELINE.FRAME_WIDTH / 2;
    // IMPORTANT: Use actual frame height to calculate correct frameTop
    // The frame expands downward, so the top stays at: centerY - height/2
    const frameHeight = actualFrameHeight || TIMELINE.FRAME_HEIGHT;
    const frameTop = this.frameCenterY - frameHeight / 2;

    const startX = frameLeft + TIMELINE.PADDING;
    const statusHeaderY = frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT / 2;
    const dropZoneTopY = statusHeaderY + TIMELINE.HEADER_HEIGHT / 2 + 5;

    const columns: TimelineColumn[] = [];

    // All 7 columns in one row
    for (let i = 0; i < TIMELINE_COLUMNS.length; i++) {
      const col = TIMELINE_COLUMNS[i];
      if (!col) continue;

      const colX = startX + TIMELINE.COLUMN_WIDTH / 2 + i * (TIMELINE.COLUMN_WIDTH + TIMELINE.COLUMN_GAP);
      const columnColor = normalizeMiroColor(col.color, '#6B7280');
      columns.push({
        id: col.id,
        label: col.label,
        color: columnColor,
        x: colX,
        y: dropZoneTopY, // TOP of drop zone
        width: TIMELINE.COLUMN_WIDTH,
      });
    }

    return columns;
  }

  private async ensureFilesChatColumn({
    frameLeft,
    frameTop,
    frameWidth,
    frameHeight,
  }: {
    frameLeft: number;
    frameTop: number;
    frameWidth: number;
    frameHeight: number;
  }): Promise<void> {
    log('MiroTimeline', '🔵 ensureFilesChatColumn called', { frameLeft, frameTop, frameWidth, frameHeight });
    const miro = getMiroSDK();
    const shapes = await miro.board.get({ type: 'shape' }) as Array<{
      content?: string;
      x: number;
      y: number;
      width: number;
      height: number;
      shape?: string;
    }>;
    const frameRight = frameLeft + frameWidth;
    const frameBottom = frameTop + frameHeight;
    const frameShapes = shapes.filter((shape) =>
      shape.x >= frameLeft &&
      shape.x <= frameRight &&
      shape.y >= frameTop &&
      shape.y <= frameBottom
    );
    log('MiroTimeline', `Found ${frameShapes.length} shapes in timeline frame`);

    const label = MiroMasterTimelineService.FILES_CHAT_COLUMN.label;
    const normalizedLabel = label.replace(/\s+/g, ' ').toLowerCase();
    const existingHeader = frameShapes.find((shape) => {
      const content = shape.content?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').toLowerCase() ?? '';
      return content.includes(normalizedLabel);
    });

    if (existingHeader) {
      log('MiroTimeline', '✅ Files/Chat column already exists, skipping');
      return;
    }
    log('MiroTimeline', '🔵 Files/Chat column not found, creating...');

    const doneHeader = frameShapes.find((shape) => {
      const content = stripHtml(shape.content).toLowerCase();
      const isHeaderHeight = shape.height >= TIMELINE.HEADER_HEIGHT - 6 && shape.height <= TIMELINE.HEADER_HEIGHT + 6;
      const isHeaderWidth = shape.width >= TIMELINE.COLUMN_WIDTH - 40 && shape.width <= TIMELINE.COLUMN_WIDTH + 40;
      return content === 'done' && isHeaderHeight && isHeaderWidth;
    });
    log('MiroTimeline', doneHeader ? '✅ Found DONE header' : '❌ DONE header not found', doneHeader ? { x: doneHeader.x, y: doneHeader.y, width: doneHeader.width, height: doneHeader.height } : null);

    const reviewHeader = frameShapes.find((shape) => {
      const content = stripHtml(shape.content).toLowerCase();
      const isHeaderHeight = shape.height >= TIMELINE.HEADER_HEIGHT - 6 && shape.height <= TIMELINE.HEADER_HEIGHT + 6;
      const isHeaderWidth = shape.width >= TIMELINE.COLUMN_WIDTH - 40 && shape.width <= TIMELINE.COLUMN_WIDTH + 40;
      return content === 'review' && isHeaderHeight && isHeaderWidth;
    });
    log('MiroTimeline', reviewHeader ? '✅ Found REVIEW header' : '⚠️ REVIEW header not found');

    let colX: number | null = null;
    let headerY: number | null = null;
    let columnWidth = (TIMELINE.COLUMN_WIDTH as number) * 2; // Double width for Files/Chat column
    let headerHeight = TIMELINE.HEADER_HEIGHT as number;
    let dropY: number | null = null;
    let columnHeight = TIMELINE.COLUMN_HEIGHT as number;

    const defaultHeaderY = frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT / 2;
    const defaultDropZoneTopY = defaultHeaderY + TIMELINE.HEADER_HEIGHT / 2 + 5;

    if (doneHeader) {
      columnWidth = doneHeader.width * 2; // Double the width for Files/Chat column
      log('MiroTimeline', '📏 Files/Chat column width set to 2x DONE column width', { doneWidth: doneHeader.width, filesChatWidth: columnWidth });
      headerHeight = doneHeader.height;
      headerY = doneHeader.y;
      const gapFromHeaders = reviewHeader
        ? doneHeader.x - reviewHeader.x - (doneHeader.width + reviewHeader.width) / 2
        : TIMELINE.COLUMN_GAP;
      const gap = gapFromHeaders > 4 ? gapFromHeaders : TIMELINE.COLUMN_GAP;
      // Position X is CENTER of shape, so: done center + half done width + gap + half new column width
      colX = doneHeader.x + doneHeader.width / 2 + gap + columnWidth / 2;

      const doneDropZone = frameShapes.find((shape) => {
        const isRectangle = shape.shape === 'rectangle';
        const isColumnWidth = Math.abs(shape.width - doneHeader.width) <= 10;
        const isTall = shape.height >= 200;
        const xAligned = Math.abs(shape.x - doneHeader.x) <= 6;
        return isRectangle && isColumnWidth && isTall && xAligned;
      });

      if (doneDropZone) {
        columnHeight = doneDropZone.height;
        dropY = doneDropZone.y;
      }
    }

    if (headerY === null) {
      headerY = defaultHeaderY;
    }

    if (dropY === null) {
      const columnSample = frameShapes.find((shape) => {
        const isRectangle = shape.shape === 'rectangle';
        const isColumnWidth = Math.abs(shape.width - TIMELINE.COLUMN_WIDTH) <= 10;
        const isTall = shape.height >= 200;
        const shapeTop = shape.y - shape.height / 2;
        const isDropZone = shapeTop > frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT - 20;
        return isRectangle && isColumnWidth && isTall && isDropZone;
      });

      columnHeight = columnSample?.height ?? columnHeight;
      dropY = defaultDropZoneTopY + columnHeight / 2;
      const maxDropY = frameBottom - TIMELINE.PADDING - columnHeight / 2;
      if (dropY > maxDropY) {
        dropY = maxDropY;
      }
    }

    if (colX === null) {
      colX = frameRight - TIMELINE.PADDING - columnWidth / 2;
    }

    const minColX = frameLeft + TIMELINE.PADDING + columnWidth / 2;
    const maxColX = frameRight - TIMELINE.PADDING - columnWidth / 2;
    if (colX < minColX) colX = minColX;
    if (colX > maxColX) colX = maxColX;

    log('MiroTimeline', '📍 Final calculated position', { colX, headerY, dropY, columnWidth, columnHeight });

    if (colX === null || headerY === null || dropY === null) {
      log('MiroTimeline', '❌ Cannot create Files/Chat column - missing position data', { colX, headerY, dropY });
      return;
    }

    log('MiroTimeline', '🎨 Creating Files/Chat header shape...');
    await miro.board.createShape({
      shape: 'round_rectangle',
      content: `<p><b>${label}</b></p>`,
      x: colX,
      y: headerY,
      width: columnWidth,
      height: headerHeight,
      style: {
        fillColor: MiroMasterTimelineService.FILES_CHAT_COLUMN.color,
        borderColor: 'transparent',
        borderWidth: 0,
        color: '#FFFFFF',
        fontSize: 8,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    log('MiroTimeline', '🎨 Creating Files/Chat drop zone shape...');
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: colX,
      y: dropY,
      width: columnWidth,
      height: columnHeight,
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#000000',
        borderWidth: 2,
      },
    });
    log('MiroTimeline', '✅ Files/Chat column created successfully!');
  }

  async syncProject(project: Project, options?: { markAsReviewed?: boolean }): Promise<TimelineCard> {
    if (!this.state) throw new Error('Timeline not initialized');

    // Prevent concurrent syncs for the same project
    if (this.syncingProjects.has(project.id)) {
      log('MiroTimeline', `Already syncing project "${project.name}", skipping duplicate call`);
      // Return existing card info if available
      const existingCard = this.state.cards.find(c => c.projectId === project.id);
      if (existingCard) return existingCard;
      throw new Error('Sync already in progress');
    }

    this.syncingProjects.add(project.id);

    // Wait for any in-progress sync to complete before starting (serializes syncs)
    const previousLock = this.syncLock;
    let resolveMyLock: () => void = () => {};
    this.syncLock = new Promise<void>(resolve => {
      resolveMyLock = resolve;
    });

    try {
      // Wait for previous sync to complete
      await previousLock;
      const result = await this._syncProjectInternal(project, options);

      // Also update briefing frame badges (due date + status) so they stay in sync
      // miroProjectRowService is a module-level singleton initialized after this class
      try {
        await miroProjectRowService.updateBriefingDueDate(project.id, project.dueDate ?? null, project.name);
        await miroProjectRowService.updateBriefingStatus(project.id, project.status, project.name);
      } catch (err) {
        log('MiroTimeline', 'Briefing badge sync during timeline sync failed (non-fatal)', err);
      }

      return result;
    } finally {
      this.syncingProjects.delete(project.id);
      // Release the lock for next sync
      resolveMyLock();
    }
  }

  private async _syncProjectInternal(project: Project, options?: { markAsReviewed?: boolean }): Promise<TimelineCard> {
    if (!this.state) throw new Error('Timeline not initialized');

    const miro = getMiroSDK();
    this.refreshColumnColors();
    if (this.state.frameId) {
      const frame = await miro.board.getById(this.state.frameId) as MiroFrame | null;
      if (frame) {
        await this.updateTimelineHeaderColors(frame);
      }
    }
    const status = getTimelineStatus(project);
    const column = this.state.columns.find(c => c.id === status);
    if (!column) throw new Error(`Column ${status} not found`);
    const columnColor = normalizeMiroColor(column.color, '#6B7280');

    timelineLogger.debug('Syncing project', { name: project.name, id: project.id, status });

    // STEP 1: Get all cards from board
    let allBoardCards: MiroCard[] = [];
    try {
      allBoardCards = await miro.board.get({ type: 'card' }) as MiroCard[];
      log('MiroTimeline', `Found ${allBoardCards.length} total cards on board`);
    } catch (e) {
      log('MiroTimeline', 'Failed to get board cards', e);
    }

    // STEP 1.5: Check if card already exists on board for THIS project
    const existingCard = allBoardCards.find(c => c.description?.includes(`projectId:${project.id}`));

    // Check if card is ALREADY in the correct column (by X position)
    const columnX = column.x;
    const columnWidth = column.width ?? TIMELINE.COLUMN_WIDTH;
    const isCardInCorrectColumn = existingCard && Math.abs(existingCard.x - columnX) < columnWidth / 2;

    timelineLogger.debug('Card status', {
      exists: !!existingCard,
      currentX: existingCard?.x,
      currentY: existingCard?.y,
      targetColumnX: columnX,
      isInCorrectColumn: isCardInCorrectColumn
    });

    // STEP 1.6: Check if card was reviewed - DB is source of truth
    // markAsReviewed option is used when client explicitly marks as reviewed
    // project.wasReviewed comes from DB and is reset when status changes back to 'review'
    const wasReviewed = options?.markAsReviewed || project.wasReviewed || false;
    log('MiroTimeline', `Review status: wasReviewed=${wasReviewed} (from DB/options)`)

    // Build priority indicator with colored circles
    const priorityIcon = project.priority === 'urgent' ? '🔴' :
                         project.priority === 'high' ? '🟠' :
                         project.priority === 'medium' ? '🟡' :
                         '🟢'; // low/standard
    const normalizedDueDate = normalizeDateToYYYYMMDD(project.dueDate);

    // Build compact card title:
    // - Line 1: Project title (plus status tag)
    // - Line 2: Priority icon
    const isArchived = project.archivedAt !== null;
    const isApproved = project.wasApproved === true;
    // Show changes requested indicator when wasReviewed=true AND status is in_progress
    const hasChangesRequested = wasReviewed && status === 'in_progress';

    // Status prefix: Archived > Approved > Changes Requested > none
    const statusTag = isArchived ? '📦 ' :
                      isApproved ? '✓ ' :
                      hasChangesRequested ? '🔄 ' : '';

    // Build multi-line title with all project details
    const titleLines: string[] = [];

    titleLines.push(`${statusTag}${project.name}`.trim());
    titleLines.push(priorityIcon);

    // For Done projects: add completion dates and "days early" inside the card
    if (status === 'done' && project.completedAt) {
      const completedDate = formatDateShort(project.completedAt);
      const dueDate = project.dueDate ? formatDateShort(project.dueDate) : null;
      const early = getDaysEarly(project.dueDate, project.completedAt);

      if (dueDate) {
        titleLines.push(`Due: ${dueDate} | Done: ${completedDate}`);
      } else {
        titleLines.push(`Done: ${completedDate}`);
      }
      if (early) {
        titleLines.push(`🟢 ${early.text}`);
      }
    }

    // Use plain text with newlines for card title (Miro SDK v2 supports \n in title)
    const cardTitle = titleLines.join('\n');

    // Build description with changes requested flag
    const description = `projectId:${project.id}${hasChangesRequested ? '|changes_requested:true' : ''}`;

    // STEP 2: Find existing card BY PROJECTID IN DESCRIPTION (works across iframe contexts)
    // This is the source of truth - search on the actual board, not memory
    const existingCardOnBoard: MiroCard | undefined = existingCard;
    if (existingCardOnBoard) {
      log('MiroTimeline', `Found existing card on board: ${existingCardOnBoard.id} (by projectId in description)`);
    }

    // STEP 3: Also check memory for backwards compatibility
    let existingInMemory = this.state.cards.find(c => c.projectId === project.id);

    // If we found a card on board but not in memory, update memory
    if (existingCardOnBoard && !existingInMemory) {
      log('MiroTimeline', `Card found on board but not in memory, adding to memory`);
      existingInMemory = {
        id: crypto.randomUUID(),
        projectId: project.id,
        projectName: project.name,
        clientName: project.client?.name || null,
        dueDate: project.dueDate,
        status: status,
        miroCardId: existingCardOnBoard.id,
        x: existingCardOnBoard.x,
        y: existingCardOnBoard.y,
      };
      this.state.cards.push(existingInMemory);
    }

    // If memory says card exists but board doesn't have it, clear memory
    if (existingInMemory?.miroCardId && !existingCardOnBoard) {
      const memoryCardStillOnBoard = allBoardCards.some(c => c.id === existingInMemory!.miroCardId);
      if (!memoryCardStillOnBoard) {
        log('MiroTimeline', `Memory card ${existingInMemory.miroCardId} no longer on board, clearing memory`);
        this.state.cards = this.state.cards.filter(c => c.projectId !== project.id);
        existingInMemory = undefined;
      }
    }

    // STEP 4: Calculate new position in target column
    // IMPORTANT: If card already exists in the CORRECT column, keep its Y position!
    // This prevents cards from drifting down on each sync
    const cardX = columnX; // Always use column X

    // Get current frame bounds from the actual frame on board FIRST
    // The timeline frame has no title (empty string) or could match by position
    const frames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
    let timelineFrame = frames.find(f =>
      f.title === '' &&
      Math.abs(f.x - this.frameCenterX) < 100
    );

    // Fallback: Find by state frameId
    if (!timelineFrame && this.state?.frameId) {
      timelineFrame = frames.find(f => f.id === this.state!.frameId);
    }

    // If no frame found at expected position, try finding by any empty title frame near origin
    if (!timelineFrame) {
      timelineFrame = await findTimelineFrame() as MiroFrame | null ?? undefined;
      if (timelineFrame) {
        // Update our center coordinates to match the actual frame
        this.frameCenterX = timelineFrame.x;
        this.frameCenterY = timelineFrame.y;
        log('MiroTimeline', 'Updated frame center from found frame', { x: this.frameCenterX, y: this.frameCenterY });
      }
    }

    timelineLogger.debug('Found timeline frame', { id: timelineFrame?.id, x: timelineFrame?.x, y: timelineFrame?.y, width: timelineFrame?.width, height: timelineFrame?.height });

    if (timelineFrame) {
      const frameWidth = timelineFrame.width ?? TIMELINE.FRAME_WIDTH;
      const frameHeight = timelineFrame.height ?? TIMELINE.FRAME_HEIGHT;
      const frameLeft = timelineFrame.x - frameWidth / 2;
      const frameTop = timelineFrame.y - frameHeight / 2;
      await this.ensureFilesChatColumn({ frameLeft, frameTop, frameWidth, frameHeight });
    }

    // Calculate frame bounds
    // IMPORTANT: The frameTop should ALWAYS be at a FIXED position relative to origin
    // The timeline is created at Y=0 with height 500, so frameTop = 0 - 500/2 = -250
    // When the frame expands, it grows DOWNWARD, keeping the top fixed
    // So we calculate frameTop from the ORIGINAL center position (0) and ORIGINAL height
    const currentFrameHeight = timelineFrame?.height || TIMELINE.FRAME_HEIGHT;

    // The ORIGINAL frame was centered at Y=0 with height TIMELINE.FRAME_HEIGHT
    // So the original top was at: 0 - TIMELINE.FRAME_HEIGHT / 2
    const ORIGINAL_FRAME_TOP = 0 - TIMELINE.FRAME_HEIGHT / 2; // = -250
    const frameTop = ORIGINAL_FRAME_TOP; // ALWAYS use the original top position
    const frameBottom = frameTop + currentFrameHeight; // Bottom changes as frame grows

    // Calculate first card Y position (inside the column, below header)
    // Header is at: frameTop + PADDING + HEADER_HEIGHT/2
    // Drop zone starts at: frameTop + PADDING + HEADER_HEIGHT + small gap
    const dropZoneTop = frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT + 10;
    const firstCardY = dropZoneTop + TIMELINE.CARD_HEIGHT / 2 + 10; // Start cards 10px inside drop zone

    timelineLogger.debug('Frame calculations', { ORIGINAL_FRAME_TOP, frameTop, frameBottom, currentFrameHeight });

    // Find all cards that have projectId in description (our cards) in this column
    // Use description matching instead of position matching for reliability
    const allProjectCards = allBoardCards.filter(c => c.description?.includes('projectId:'));

    // Find cards in THIS column by checking their target status
    // A card is "in this column" if it belongs to a project with the same status
    const cardsInColumnOnBoard = allProjectCards.filter(c => {
      // Extract projectId from description
      const match = c.description?.match(/projectId:([a-f0-9-]+)/);
      if (!match) return false;
      const cardProjectId = match[1];
      // Exclude this project's card
      if (cardProjectId === project.id) return false;
      // Check if card is physically in this column's X range
      const inColumnX = Math.abs(c.x - columnX) < columnWidth / 2;
      return inColumnX;
    });

    timelineLogger.debug('Found other cards in column', { count: cardsInColumnOnBoard.length, status });

    // Sort cards by Y position (top to bottom)
    cardsInColumnOnBoard.sort((a, b) => a.y - b.y);

    // Calculate Y position based on whether card exists in correct column
    let cardY: number;

    if (isCardInCorrectColumn && existingCard) {
      // IMPORTANT: Card already exists in the correct column - KEEP ITS POSITION
      // This prevents cards from drifting down on each sync
      cardY = existingCard.y;
      timelineLogger.debug('Card already in correct column, keeping Y position', { cardY });
    } else if (cardsInColumnOnBoard.length > 0) {
      // Card is NEW to this column (either new card or moved from another column)
      // Find the lowest card (highest Y value) and position below it
      const lowestCard = cardsInColumnOnBoard[cardsInColumnOnBoard.length - 1];
      if (lowestCard) {
        // Position new card below the lowest card with gap
        const lowestCardBottom = lowestCard.y + (lowestCard.height || TIMELINE.CARD_HEIGHT) / 2;
        cardY = lowestCardBottom + TIMELINE.CARD_GAP + TIMELINE.CARD_HEIGHT / 2;
        timelineLogger.debug('Positioning below lowest card', { cardY });
      } else {
        cardY = firstCardY;
      }
    } else {
      // First card in column
      cardY = firstCardY;
      timelineLogger.debug('First card in column', { cardY });
    }

    // Check if ANY card in the timeline would exceed frame bottom and expand if needed
    // This includes the current card AND all other cards in ALL columns
    // IMPORTANT: Use a larger padding that accounts for at least one more card + gap
    // This ensures we expand BEFORE a card would be placed outside the frame
    const bottomPadding = 50 + TIMELINE.CARD_HEIGHT + TIMELINE.CARD_GAP; // ~94px to ensure next card will fit
    let currentFrameBottom = frameBottom;

    // Find the lowest card across ALL columns in the timeline
    const allProjectCardsInTimeline = allBoardCards.filter(c => {
      if (!c.description?.includes('projectId:')) return false;
      // Check if card is within the timeline frame X bounds
      const frameLeft = (timelineFrame?.x || this.frameCenterX) - TIMELINE.FRAME_WIDTH / 2;
      const frameRight = (timelineFrame?.x || this.frameCenterX) + TIMELINE.FRAME_WIDTH / 2;
      return c.x >= frameLeft && c.x <= frameRight;
    });

    // Include the current card's planned position
    const allCardBottoms = [
      ...allProjectCardsInTimeline.map(c => c.y + (c.height || TIMELINE.CARD_HEIGHT) / 2),
      cardY + TIMELINE.CARD_HEIGHT / 2 // The card we're syncing
    ];

    const lowestCardBottom = Math.max(...allCardBottoms);

    const needsExpansion = lowestCardBottom + bottomPadding > currentFrameBottom;
    timelineLogger.debug('Checking frame expansion', {
      cardsInTimeline: allProjectCardsInTimeline.length,
      lowestCardBottom,
      bottomPadding,
      currentFrameBottom,
      threshold: lowestCardBottom + bottomPadding,
      needsExpansion
    });

    if (needsExpansion) {
      // Triple the current frame height to create plenty of room for upcoming cards
      // This avoids frequent small expansions and gives a large buffer at once
      const tripledHeight = currentFrameHeight * 3;
      // Also calculate the minimum needed height as a safety floor
      const extraBuffer = 50;
      const minNeededHeight = (lowestCardBottom + bottomPadding + extraBuffer) - ORIGINAL_FRAME_TOP;
      // Use whichever is larger: tripled height or minimum needed
      const newHeight = Math.max(tripledHeight, minNeededHeight);
      // IMPORTANT: When frame grows, its center Y moves down to keep TOP fixed
      // newCenterY = frameTop + newHeight / 2 = ORIGINAL_FRAME_TOP + newHeight / 2
      const newCenterY = ORIGINAL_FRAME_TOP + newHeight / 2;

      timelineLogger.debug('Expanding frame', {
        oldHeight: currentFrameHeight,
        newHeight,
        newCenterY,
        lowestCardBottom,
        frameBottom: currentFrameBottom,
        needed: lowestCardBottom + bottomPadding - currentFrameBottom,
        ORIGINAL_FRAME_TOP
      });

      if (timelineFrame) {
        timelineFrame.height = newHeight;
        timelineFrame.y = newCenterY;
        await miro.board.sync(timelineFrame);
        timelineLogger.debug('Frame expanded successfully', { newHeight, centerY: newCenterY });

        // Update the frame bottom for this sync (top stays fixed)
        currentFrameBottom = ORIGINAL_FRAME_TOP + newHeight;
      }

      // Also expand the column drop zones to match
      await this.expandColumnDropZones(ORIGINAL_FRAME_TOP, newHeight);
    }

    timelineLogger.debug('Card position', {
      cardX,
      cardY,
      firstCardY,
      frameTop,
      frameBottom: currentFrameBottom,
      cardsInColumn: cardsInColumnOnBoard.length
    });

    // STEP 5: Update or create card
    // Use the card found on board (source of truth) or memory as fallback
    const existingMiroCardId = existingCardOnBoard?.id || existingInMemory?.miroCardId;

    if (existingMiroCardId) {
      try {
        const item = await miro.board.getById(existingMiroCardId) as MiroCard;
        if (item) {
          // CRITICAL: If card is already in the correct column, ONLY update title/style
          // Do NOT change the position - this prevents drift on re-syncs
          const itemInCorrectColumn = Math.abs(item.x - cardX) < columnWidth / 2;

          item.title = cardTitle;
          item.description = description; // Ensure projectId is stored
          if (normalizedDueDate) {
            item.dueDate = normalizedDueDate;
          } else {
            delete (item as Partial<MiroCard>).dueDate;
          }
          item.style = { cardTheme: isArchived ? '#000000' : columnColor };

          if (itemInCorrectColumn) {
            // Card is already in correct column - keep its current position
            timelineLogger.debug('Card already in correct column, keeping position', { x: item.x, y: item.y });
          } else {
            // Card is moving to a different column - update position
            item.x = cardX;
            item.y = cardY;
            timelineLogger.debug('Moving card to new column', { x: cardX, y: cardY });
          }

          await miro.board.sync(item);

          log('MiroTimeline', `UPDATED card ${existingMiroCardId} in ${status}`);

          // Update memory state - use ACTUAL item position (not calculated)
          const finalX = item.x;
          const finalY = item.y;
          if (existingInMemory) {
            existingInMemory.status = status;
            existingInMemory.x = finalX;
            existingInMemory.y = finalY;
            existingInMemory.projectName = project.name;
            existingInMemory.clientName = project.client?.name || null;
            existingInMemory.miroCardId = existingMiroCardId;
          }

          // Add/remove completion date text for Done cards
          await this.handleCompletionDateText(project, status, finalX, finalY);

          return existingInMemory || {
            id: crypto.randomUUID(),
            projectId: project.id,
            projectName: project.name,
            clientName: project.client?.name || null,
            dueDate: project.dueDate,
            status,
            miroCardId: existingMiroCardId,
            x: finalX,
            y: finalY,
          };
        }
      } catch (e) {
        log('MiroTimeline', `Card ${existingMiroCardId} not found on board, will create new`, e);
        // Remove from memory state
        this.state.cards = this.state.cards.filter(c => c.projectId !== project.id);
      }
    }

    // STEP 6: Create new card ONLY if none exists
    // IMPORTANT: Double-check for existing cards before creating to avoid duplicates
    // This handles race conditions where getById failed but card still exists
    try {
      const freshBoardCards = await miro.board.get({ type: 'card' }) as MiroCard[];
      const existingCardFinalCheck = freshBoardCards.find(c => c.description?.includes(`projectId:${project.id}`));

      if (existingCardFinalCheck) {
        log('MiroTimeline', `Found existing card in final check: ${existingCardFinalCheck.id}, updating instead of creating`);
        // CRITICAL: Check if card is already in correct column before moving
        const finalCheckInCorrectColumn = Math.abs(existingCardFinalCheck.x - cardX) < columnWidth / 2;

        // Update the existing card - only move if in different column
        existingCardFinalCheck.title = cardTitle;
        existingCardFinalCheck.description = description;
        if (normalizedDueDate) {
          existingCardFinalCheck.dueDate = normalizedDueDate;
        } else {
          delete (existingCardFinalCheck as Partial<MiroCard>).dueDate;
        }
        existingCardFinalCheck.style = { cardTheme: isArchived ? '#000000' : columnColor };

        if (!finalCheckInCorrectColumn) {
          // Only update position if card is in a different column
          existingCardFinalCheck.x = cardX;
          existingCardFinalCheck.y = cardY;
          timelineLogger.debug('Final check: Moving card to new column');
        } else {
          timelineLogger.debug('Final check: Card already in correct column, keeping position');
        }

        await miro.board.sync(existingCardFinalCheck);
        await registerMiroItem({
          projectId: project.id,
          itemType: 'timeline_card',
          miroItemId: existingCardFinalCheck.id,
        });

        // Use ACTUAL position from card (not calculated) to preserve existing position
        const updatedCard: TimelineCard = {
          id: crypto.randomUUID(),
          projectId: project.id,
          projectName: project.name,
          clientName: project.client?.name || null,
          dueDate: project.dueDate,
          status,
          miroCardId: existingCardFinalCheck.id,
          x: existingCardFinalCheck.x,
          y: existingCardFinalCheck.y,
        };

        // Update memory state
        this.state.cards = this.state.cards.filter(c => c.projectId !== project.id);
        this.state.cards.push(updatedCard);

        // Add/remove completion date text for Done cards
        await this.handleCompletionDateText(project, status, existingCardFinalCheck.x, existingCardFinalCheck.y);

        return updatedCard;
      }
    } catch (e) {
      log('MiroTimeline', 'Final check for existing card failed, proceeding with create', e);
    }

    log('MiroTimeline', `Creating NEW card for "${project.name}" at position (${cardX}, ${cardY})`);

    // Create card with multi-line title (using \n for line breaks)
    // Use black (var(--color-primary)) for archived projects
    const cardColor = isArchived ? '#000000' : columnColor;
    const newMiroCard = await miro.board.createCard({
      title: cardTitle,
      description, // Store projectId in description for cross-context discovery
      x: cardX,
      y: cardY,
      width: TIMELINE.CARD_WIDTH,
      ...(normalizedDueDate ? { dueDate: normalizedDueDate } : {}),
      style: { cardTheme: cardColor },
    });
    await registerMiroItem({
      projectId: project.id,
      itemType: 'timeline_card',
      miroItemId: newMiroCard.id,
    });

    const newCard: TimelineCard = {
      id: crypto.randomUUID(),
      projectId: project.id,
      projectName: project.name,
      clientName: project.client?.name || null,
      dueDate: project.dueDate,
      status,
      miroCardId: newMiroCard.id,
      x: cardX,
      y: cardY,
    };

    this.state.cards.push(newCard);
    log('MiroTimeline', `Created card ${newMiroCard.id} for project "${project.name}" at Y=${cardY}`);

    // Add/remove completion date text for Done cards
    await this.handleCompletionDateText(project, status, cardX, cardY);

    return newCard;
  }

  /**
   * Expand the column drop zones when frame is resized
   */
  async expandColumnDropZones(frameTop: number, newFrameHeight: number): Promise<void> {
    const miro = getMiroSDK();

    try {
      // Get current frame position (might have changed if frame expanded)
      const frames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
      let currentFrameX = this.frameCenterX;

      // Find the timeline frame to get accurate X position
      const timelineFrame = frames.find(f =>
        f.title === '' && Math.abs(f.x - this.frameCenterX) < 100
      ) || (this.state?.frameId ? frames.find(f => f.id === this.state!.frameId) : null);

      if (timelineFrame) {
        currentFrameX = timelineFrame.x;
      }

      const frameLeft = currentFrameX - TIMELINE.FRAME_WIDTH / 2;
      const frameRight = currentFrameX + TIMELINE.FRAME_WIDTH / 2;
      const newFrameBottom = frameTop + newFrameHeight;

      timelineLogger.debug('expandColumnDropZones: Looking for columns', { frameLeft, frameRight });

      // Find all rectangle shapes (column drop zones)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const shapes = await miro.board.get({ type: 'shape' }) as any[];

      // Find ALL drop zones: rectangles within frame X bounds with column-like width
      // Column width is TIMELINE.COLUMN_WIDTH (95), so allow 80-120 range
      // IMPORTANT: Expand ALL shapes that look like columns (don't deduplicate)
      // because there may be multiple overlapping shapes at the same X position
      const columnDropZones = shapes.filter((s: { id: string; shape?: string; x: number; y: number; height: number; width: number; style?: { fillColor?: string; borderColor?: string } }) => {
        const isRectangle = s.shape === 'rectangle';
        const inFrameX = s.x >= frameLeft - 10 && s.x <= frameRight + 10;
        const isColumnWidth = s.width >= 80 && s.width <= 120;
        // Check it's a tall shape (column drop zones are tall - at least 200px)
        const isTall = s.height >= 200;
        // Also check the shape is in the column area (below the header)
        const shapeTop = s.y - s.height / 2;
        const isDropZone = shapeTop > frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT - 20;

        // Check if valid column drop zone - just need to be correct position and size
        const isValid = isRectangle && inFrameX && isColumnWidth && isTall && isDropZone;

        return isValid;
      });

      timelineLogger.debug('Found column drop zones to expand', { count: columnDropZones.length });

      // Calculate new column dimensions
      // Columns should fill from below header to near bottom of frame
      const newColumnHeight = newFrameHeight - TIMELINE.PADDING * 2 - TIMELINE.HEADER_HEIGHT - 15;
      const newColumnTopY = frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT + 10;
      const newColumnCenterY = newColumnTopY + newColumnHeight / 2;

      timelineLogger.debug('New column dimensions', {
        newColumnHeight,
        newColumnTopY,
        newColumnCenterY,
        frameTop,
        newFrameHeight
      });

      // Expand ALL column shapes (not just unique ones)
      let expandedCount = 0;
      for (const zone of columnDropZones) {
        const oldHeight = zone.height;
        const oldY = zone.y;
        zone.height = newColumnHeight;
        zone.y = newColumnCenterY;
        await miro.board.sync(zone);
        expandedCount++;
        timelineLogger.debug('Expanded column', { id: zone.id, x: Math.round(zone.x), oldY: Math.round(oldY), newY: Math.round(newColumnCenterY), oldHeight, newHeight: newColumnHeight });
      }
      timelineLogger.debug('Total columns expanded', { count: expandedCount });

      // Also find and move any horizontal separator lines or borders
      // These can be:
      // 1. Wide rectangles (spanning multiple columns) that are thin (height < 10)
      // 2. Lines inside the frame area that aren't column drop zones
      const separatorLines = shapes.filter((s: { id: string; shape?: string; x: number; y: number; height: number; width: number; style?: { fillColor?: string; borderColor?: string } }) => {
        const isRectangle = s.shape === 'rectangle';
        const inFrameX = s.x >= frameLeft - 10 && s.x <= frameRight + 10;

        // Check for horizontal separator patterns:
        // Pattern 1: Wide thin rectangle (traditional separator)
        const isWideThinLine = s.width > 200 && s.height <= 10;

        // Pattern 2: Full-width line spanning the frame
        const isFullWidthLine = s.width > TIMELINE.FRAME_WIDTH * 0.8 && s.height <= 10;

        // Pattern 3: Narrow tall shape that spans the full height (vertical divider)
        // Skip these - we only want horizontal separators
        const isVerticalDivider = s.width <= 10 && s.height > 50;
        if (isVerticalDivider) return false;

        // Must be a thin horizontal shape (separator) within the frame X bounds
        const isSeparator = isRectangle && inFrameX && (isWideThinLine || isFullWidthLine);

        // Skip if it's at the very top (header area)
        const isInContentArea = s.y > frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT + 50;

        if (isSeparator && isInContentArea) {
          timelineLogger.debug('Found separator line', { id: s.id, x: s.x, y: s.y, width: s.width, height: s.height });
        }

        return isSeparator && isInContentArea;
      });

      timelineLogger.debug('Found separator lines to move', { count: separatorLines.length });

      // Move separator lines to new frame bottom
      for (const line of separatorLines) {
        const newLineY = newFrameBottom - TIMELINE.PADDING;
        timelineLogger.debug('Moving separator line', { fromY: line.y, toY: newLineY });
        line.y = newLineY;
        await miro.board.sync(line);
      }

      if (columnDropZones.length === 0) {
        timelineLogger.warn('No column drop zones found to expand');
      }
    } catch (e) {
      timelineLogger.error('Failed to expand column drop zones', e);
    }
  }

  async removeProject(projectId: string): Promise<void> {
    if (!this.state) return;
    const card = this.state.cards.find(c => c.projectId === projectId);
    if (card?.miroCardId) {
      await safeRemove(card.miroCardId);
    }
    this.state.cards = this.state.cards.filter(c => c.projectId !== projectId);
  }

  /**
   * Clean up all duplicate cards on the board
   * Keeps only one card per projectId (using description field)
   */
  async cleanupDuplicates(): Promise<number> {
    const miro = getMiroSDK();
    let removedCount = 0;

    try {
      const allCards = await miro.board.get({ type: 'card' }) as MiroCard[];
      log('MiroTimeline', `Scanning ${allCards.length} cards for duplicates...`);

      // Group cards by projectId (extracted from description)
      const cardsByProjectId = new Map<string, MiroCard[]>();
      for (const card of allCards) {
        // Extract projectId from description (format: "projectId:xxx-xxx-xxx")
        const match = card.description?.match(/projectId:([a-f0-9-]+)/);
        const projectId = match?.[1];
        if (!projectId) continue;

        const existing = cardsByProjectId.get(projectId) || [];
        existing.push(card);
        cardsByProjectId.set(projectId, existing);
      }

      // Remove duplicates (keep first, remove rest)
      for (const [projectId, cards] of cardsByProjectId) {
        if (cards.length > 1) {
          const title = cards[0]?.title?.split('\n')[0] || projectId;
          log('MiroTimeline', `Found ${cards.length} cards for "${title}" (${projectId}), removing ${cards.length - 1} duplicates`);
          for (let i = 1; i < cards.length; i++) {
            const duplicate = cards[i];
            if (duplicate) {
              try {
                await miro.board.remove({ id: duplicate.id });
                removedCount++;
              } catch (e) {
                log('MiroTimeline', `Failed to remove duplicate`, e);
              }
            }
          }
        }
      }

      log('MiroTimeline', `Cleanup complete: removed ${removedCount} duplicate cards`);
    } catch (e) {
      log('MiroTimeline', 'Cleanup failed', e);
    }

    return removedCount;
  }

  getState() { return this.state; }
  getTimelineBottomY() { return this.frameCenterY + TIMELINE.FRAME_HEIGHT / 2; }
  getTimelineCenterX() { return this.frameCenterX; }
  getTimelineRightEdge() { return this.frameCenterX + TIMELINE.FRAME_WIDTH / 2; }
  getTimelineTopY() { return this.frameCenterY - TIMELINE.FRAME_HEIGHT / 2; }

  /**
   * Create/update/remove a green completion date text element below Done cards on timeline.
   * Cleans up legacy external completion text elements below cards.
   * Completion info is now displayed inside the card title itself.
   */
  private async handleCompletionDateText(
    project: Project,
    _status: ProjectStatus,
    _cardX: number,
    _cardY: number
  ): Promise<void> {
    const miro = getMiroSDK();
    const textTag = `completion_text:${project.id}`;

    // Remove any existing external completion text element (legacy cleanup)
    try {
      const allTexts = await miro.board.get({ type: 'text' }) as Array<{
        id: string;
        content: string;
      }>;
      const existingText = allTexts.find(t => t.content?.includes(textTag));
      if (existingText) {
        await safeRemove(existingText.id);
      }
    } catch {
      // Ignore errors
    }
  }

  // Reset the service state (for dev tools)
  reset(): void {
    this.state = null;
    this.frameCenterX = 0;
    this.frameCenterY = 0;
    this.initialized = false;
    this.syncingProjects.clear();
    log('MiroTimeline', 'Service reset');
  }
}

// ==================== PROJECT ROW SERVICE ====================

interface VersionState {
  versionNumber: number;
  frameId: string;
  centerX: number;
  centerY: number;
}

interface ExtendedProjectRow extends Omit<ProjectRowState, 'y' | 'processFrameId'> {
  versions: VersionState[];
  rowY: number;
  clientName: string;
  processFrameId: string;
  y: number;
  statusBadgeId?: string; // ID of the status badge shape for updates
  doneOverlayId?: string; // ID of the green overlay shape when project is done
}

class MiroProjectRowService {
  private rows: Map<string, ExtendedProjectRow> = new Map();
  private baseX: number = 0;
  private nextY: number = 0;
  private projectsHeaderCreated: boolean = false;
  public initialized: boolean = false;

  /**
   * Scan the board for existing project frames and calculate next Y position
   * Projects are positioned to the RIGHT of the timeline, stacked vertically
   */
  private async initializeFromBoard(): Promise<void> {
    const miro = getMiroSDK();

    // IMPORTANT: Ensure timeline is initialized first
    if (!miroTimelineService.isInitialized()) {
      log('MiroProject', 'Timeline not initialized, initializing now...');
      await miroTimelineService.initializeTimeline();
    }

    // ALWAYS scan board for timeline to get its actual current position
    // This ensures we use the real position even if the frame was moved
    const timelineFrame = await findTimelineFrame();
    let timelineRightEdge: number;
    let timelineTopY: number;

    if (timelineFrame) {
      const frameWidth = timelineFrame.width ?? TIMELINE.FRAME_WIDTH;
      const frameHeight = timelineFrame.height ?? TIMELINE.FRAME_HEIGHT;
      timelineRightEdge = timelineFrame.x + frameWidth / 2;
      timelineTopY = timelineFrame.y - frameHeight / 2;
      log('MiroProject', 'Found timeline frame on board', {
        id: timelineFrame.id,
        title: timelineFrame.title,
        x: timelineFrame.x,
        y: timelineFrame.y,
        width: frameWidth,
        height: frameHeight,
        rightEdge: timelineRightEdge,
        topY: timelineTopY
      });
    } else {
      // Fallback: use service positions or default
      timelineRightEdge = miroTimelineService.getTimelineRightEdge();
      timelineTopY = miroTimelineService.getTimelineTopY();

      // If still at default (0,0 center), use explicit default position
      if (timelineRightEdge === TIMELINE.FRAME_WIDTH / 2 && timelineTopY === -TIMELINE.FRAME_HEIGHT / 2) {
        log('MiroProject', 'Using default timeline position (0,0 center)');
      } else {
        log('MiroProject', 'Using timeline service position', { rightEdge: timelineRightEdge, topY: timelineTopY });
      }
    }

    // Set base X to the RIGHT of timeline
    this.baseX = timelineRightEdge + TIMELINE.GAP_TO_PROJECTS + FRAME.WIDTH / 2;

    // Default: first project aligned with TOP of timeline
    this.nextY = timelineTopY + FRAME.HEIGHT / 2;

    log('MiroProject', 'Project positions calculated', {
      baseX: this.baseX,
      nextY: this.nextY,
      timelineRightEdge,
      timelineTopY,
      gap: TIMELINE.GAP_TO_PROJECTS,
      frameWidth: FRAME.WIDTH
    });

    // Scan board for existing BRIEFING frames to find lowest Y
    const allFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
    log('MiroProject', `Found ${allFrames.length} total frames on board`);

    const briefingFrames = allFrames.filter(f => f.title?.includes('BRIEFING'));
    log('MiroProject', `Found ${briefingFrames.length} BRIEFING frames:`, briefingFrames.map(f => ({ title: f.title, y: f.y })));

    if (briefingFrames.length > 0) {
      log('MiroProject', `=== Processing ${briefingFrames.length} existing project frames ===`);

      // Find the lowest (highest Y value) project frame
      // Start with -Infinity to handle negative coordinates (common in Miro)
      let lowestY = -Infinity;
      let lowestFrame: typeof briefingFrames[0] | null = null;

      for (const frame of briefingFrames) {
        const frameBottom = frame.y + FRAME.HEIGHT / 2;
        log('MiroProject', `  Frame: "${frame.title}" | center Y=${frame.y} | bottom=${frameBottom}`);
        if (frameBottom > lowestY) {
          lowestY = frameBottom;
          lowestFrame = frame;
        }
      }

      log('MiroProject', `  >>> Lowest frame: "${lowestFrame?.title}" with bottom at Y=${lowestY}`);

      // Next project goes below the lowest existing one
      this.nextY = lowestY + FRAME.ROW_GAP + FRAME.HEIGHT / 2;
      log('MiroProject', `  >>> NEW PROJECT will be at Y=${this.nextY} (bottom=${lowestY} + gap=${FRAME.ROW_GAP} + halfHeight=${FRAME.HEIGHT / 2})`);

      // If there are existing project frames, header was already created
      this.projectsHeaderCreated = true;
    }

    // Also check if "Projects Overview" text exists
    try {
      const allTexts = await miro.board.get({ type: 'text' });
      const hasProjectsHeader = allTexts.some((t: { content?: string }) =>
        t.content?.includes('Projects Overview')
      );
      if (hasProjectsHeader) {
        this.projectsHeaderCreated = true;
        log('MiroProject', 'Found existing "Projects Overview" header');
      }
    } catch {
      // Ignore errors scanning for text
    }

    this.initialized = true;
  }

  async createProjectRow(project: Project, briefing: ProjectBriefing): Promise<ProjectRowState> {
    const miro = getMiroSDK();

    log('MiroProject', `=== Creating project row for: ${project.name} ===`);

    // ALWAYS scan the board for existing projects before creating new one
    // This ensures correct Y positioning even if memory state is stale
    await this.initializeFromBoard();

    log('MiroProject', `After initializeFromBoard - baseX: ${this.baseX}, nextY: ${this.nextY}`);

    // Create "Projects Overview" title ABOVE projects area if not exists
    if (!this.projectsHeaderCreated) {
      const titleY = this.nextY - TITLE.GAP - TITLE.HEIGHT / 2;

      await miro.board.createText({
        content: '<b>Projects Overview</b>',
        x: this.baseX,
        y: titleY,
        width: 200,
        style: {
          fontSize: TITLE.FONT_SIZE,
          textAlign: 'left',
        },
      });

      // Title is above, no need to adjust nextY
      this.projectsHeaderCreated = true;
    }

    const rowY = this.nextY;
    const briefingX = this.baseX;
    const briefingY = rowY;

    log('MiroProject', '========================================');
    log('MiroProject', `CREATING "${project.name}" at:`);
    log('MiroProject', `  X (center): ${briefingX}`);
    log('MiroProject', `  Y (center): ${briefingY}`);
    log('MiroProject', `  Top edge:   ${briefingY - FRAME.HEIGHT / 2}`);
    log('MiroProject', `  Bottom edge: ${briefingY + FRAME.HEIGHT / 2}`);
    log('MiroProject', '========================================');

    // Create project number based on existing projects count
    const allFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
    const existingProjects = allFrames.filter(f => f.title?.includes('- BRIEFING')).length;
    const projectNum = String(existingProjects + 1).padStart(3, '0');
    // Generate project tag with year-month-sequence format: PROJ-YYYY-MM-XXX
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const projectTag = `[PROJ-${year}-${month}-${projectNum}]`;

    const briefingFrame = await miro.board.createFrame({
      title: `${project.name} - BRIEFING ${projectTag}`,
      x: briefingX,
      y: briefingY,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    // Create briefing content
    const { items: briefingItems, statusBadgeId } = await this.createBriefingContent(project, briefing, briefingX, briefingY);

    // Create Version 1
    const version1X = briefingX + FRAME.WIDTH + FRAME.GAP;
    const version1Y = rowY;

    const version1Frame = await miro.board.createFrame({
      title: `${project.name} - VERSION 1 ${projectTag}`,
      x: version1X,
      y: version1Y,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    await registerMiroItem({
      projectId: project.id,
      itemType: 'briefing_frame',
      miroItemId: briefingFrame.id,
    });

    await registerMiroItem({
      projectId: project.id,
      itemType: 'version_frame',
      miroItemId: version1Frame.id,
      versionNumber: 1,
    });

    await Promise.all(
      briefingItems
        .filter((item) => item.miroItemId)
        .map((item) =>
          registerMiroItem({
            projectId: project.id,
            itemType: 'briefing_field',
            miroItemId: item.miroItemId as string,
            fieldKey: item.fieldKey,
          })
        )
    );

    await this.createVersionContent(version1X, version1Y, 1);

    // Update Y for next project
    this.nextY = rowY + FRAME.HEIGHT + FRAME.ROW_GAP;
    log('MiroProject', `Updated nextY for next project: ${this.nextY}`);

    // Small delay to ensure Miro API registers the new frames
    await new Promise(resolve => setTimeout(resolve, 500));

    const row: ExtendedProjectRow = {
      projectId: project.id,
      projectName: project.name,
      clientName: project.client?.name || 'Client',
      briefingFrameId: briefingFrame.id,
      processFrameId: version1Frame.id,
      y: rowY,
      briefingItems,
      processVersions: [{ id: crypto.randomUUID(), miroItemId: version1Frame.id, versionName: 'VERSION 1' }],
      versions: [{ versionNumber: 1, frameId: version1Frame.id, centerX: version1X, centerY: version1Y }],
      rowY,
      ...(statusBadgeId ? { statusBadgeId } : {}),
    };

    this.rows.set(project.id, row);

    // If project is done, add the green completion overlay
    if (project.status === 'done') {
      await this.handleDoneOverlay(project.id, 'done', briefingFrame);
    }

    // Zoom to show both the Timeline and the new project frames
    const timelineFrameId = miroTimelineService.getState()?.frameId;
    const itemsToZoom = [briefingFrame, version1Frame];
    if (timelineFrameId) {
      try {
        const timelineFrame = await miro.board.getById(timelineFrameId);
        if (timelineFrame) {
          itemsToZoom.unshift(timelineFrame as typeof briefingFrame);
        }
      } catch (e) {
        log('MiroProject', 'Could not get timeline frame for zoom', e);
      }
    }
    await miro.board.viewport.zoomTo(itemsToZoom);

    return row;
  }

  async addVersion(projectId: string, projectName?: string): Promise<VersionState | null> {
    const miro = getMiroSDK();
    let row = this.rows.get(projectId);

    // If row not in memory, try to find project frames on the board by projectId
    if (!row) {
      log('MiroProject', `Project ${projectId} not in memory, scanning board for "${projectName}"...`);

      try {
        const allFrames = await miro.board.get({ type: 'frame' }) as Array<{ id: string; title: string; x: number; y: number; width: number; height: number }>;

        // Find frames belonging to this project by matching project name in the title
        // Titles are like "Project Name - BRIEFING [PROJ-2025-12-001]"
        const searchName = projectName || '';
        const projectFrames = allFrames.filter(f => {
          if (!f.title) return false;
          // Extract project name from title (before " - ")
          const titleMatch = f.title.match(/^(.+?)\s*-\s*(BRIEFING|VERSION)/);
          const frameProjName = titleMatch?.[1]?.trim();
          return frameProjName === searchName;
        });

        log('MiroProject', `Found ${projectFrames.length} frames for project "${searchName}"`);

        if (projectFrames.length > 0) {
          // Find all VERSION frames for this project
          const versionFrames = projectFrames
            .filter(f => f.title?.includes('- VERSION'))
            .sort((a, b) => a.x - b.x); // Sort by X position (left to right)

          if (versionFrames.length > 0) {
            // Extract project name from frame title: "Project Name - VERSION 1 [PROJ-2025-12-001]" -> "Project Name"
            const firstVersionTitle = versionFrames[0]?.title || '';
            const extractedName = firstVersionTitle.split(' - ')[0]?.trim() || projectName || 'Unknown';
            const firstVersionFrame = versionFrames[0];

            // Reconstruct the row state
            const versions: VersionState[] = versionFrames.map((f, idx) => ({
              versionNumber: idx + 1,
              frameId: f.id,
              centerX: f.x,
              centerY: f.y,
            }));

            row = {
              projectId,
              projectName: extractedName,
              clientName: 'Client',
              rowY: firstVersionFrame?.y || 0,
              y: firstVersionFrame?.y || 0,
              briefingFrameId: projectFrames.find(f => f.title?.includes('- BRIEFING'))?.id || '',
              processFrameId: firstVersionFrame?.id || '',
              versions,
              briefingItems: [],
              processVersions: versionFrames.map(f => ({
                id: crypto.randomUUID(),
                miroItemId: f.id,
                versionName: f.title?.split(' - ').pop()?.replace(/\s*\[.*\]$/, '') || 'VERSION',
              })),
            };

            this.rows.set(projectId, row);
            log('MiroProject', `Reconstructed row with ${versions.length} versions for project "${extractedName}"`);
          }
        }
      } catch (e) {
        log('MiroProject', 'Failed to scan board for frames', e);
      }
    }

    if (!row) {
      log('MiroProject', `Could not find or reconstruct project ${projectId}`);
      return null;
    }

    const num = row.versions.length + 1;
    const lastVersion = row.versions[row.versions.length - 1];
    if (!lastVersion) return null; // No existing versions to position from

    // Get the actual frame from the board to check its real width (in case client expanded it)
    let actualLastFrameWidth: number = FRAME.WIDTH;
    let actualLastFrameX: number = lastVersion.centerX;

    try {
      const lastFrame = await miro.board.getById(lastVersion.frameId) as { x: number; width: number } | null;
      if (lastFrame) {
        actualLastFrameWidth = lastFrame.width || FRAME.WIDTH;
        actualLastFrameX = lastFrame.x;
        log('MiroProject', `Last version frame actual size: ${actualLastFrameWidth}x at X=${actualLastFrameX}`);
      }
    } catch (e) {
      log('MiroProject', 'Could not get last frame, using stored position', e);
    }

    // Calculate position based on the actual right edge of the previous frame
    const rightEdgeOfLastFrame = actualLastFrameX + actualLastFrameWidth / 2;
    const x = rightEdgeOfLastFrame + FRAME.GAP + FRAME.WIDTH / 2;
    const y = row.rowY;

    log('MiroProject', `Creating VERSION ${num} at X=${x} (right edge of prev: ${rightEdgeOfLastFrame})`);

    // Extract project tag from existing briefing frame title (format: [PROJ-YYYY-MM-XXX])
    let projectTag = '';
    if (row.briefingFrameId) {
      try {
        const briefingFrame = await miro.board.getById(row.briefingFrameId) as MiroFrame | null;
        const tagMatch = briefingFrame?.title?.match(/\[PROJ-\d{4}-\d{2}-\d{3}\]/);
        projectTag = tagMatch ? tagMatch[0] : '';
      } catch {
        projectTag = '';
      }
    }

    const frame = await miro.board.createFrame({
      title: `${row.projectName} - VERSION ${num} ${projectTag}`.trim(),
      x, y,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });
    await registerMiroItem({
      projectId,
      itemType: 'version_frame',
      miroItemId: frame.id,
      versionNumber: num,
    });

    await this.createVersionContent(x, y, num);

    const version: VersionState = { versionNumber: num, frameId: frame.id, centerX: x, centerY: y };
    row.versions.push(version);
    row.processVersions.push({ id: crypto.randomUUID(), miroItemId: frame.id, versionName: `VERSION ${num}` });

    await miro.board.viewport.zoomTo([frame]);
    return version;
  }

  getVersionCount(projectId: string): number {
    return this.rows.get(projectId)?.versions.length || 0;
  }

  private async createBriefingContent(
    project: Project,
    briefing: ProjectBriefing,
    frameX: number,
    frameY: number
  ): Promise<{ items: Array<{ id: string; miroItemId: string | null; fieldKey: string }>; statusBadgeId: string | null }> {
    const miro = getMiroSDK();
    const items: Array<{ id: string; miroItemId: string | null; fieldKey: string }> = [];
    let statusBadgeId: string | null = null;

    const left = frameX - FRAME.WIDTH / 2;
    const top = frameY - FRAME.HEIGHT / 2;
    const contentWidth = FRAME.WIDTH - BRIEFING.PADDING * 2;

    // === HEADER (clean, dark with project name centered) ===
    const headerY = top + BRIEFING.PADDING + 20;
    let dueDateText: string;
    if (project.status === 'done' && project.completedAt) {
      const dueStr = project.dueDate ? formatDateShort(project.dueDate) : 'No deadline';
      const completedStr = formatDateShort(project.completedAt);
      const early = getDaysEarly(project.dueDate, project.completedAt);
      dueDateText = `Due: ${dueStr} | Completed: ${completedStr}`;
      if (early) {
        dueDateText += ` (${early.text})`;
      }
    } else {
      dueDateText = project.dueDate
        ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'No deadline';
    }

    // Header background (dark, no border)
    await miro.board.createShape({
      shape: 'rectangle',
      content: `<p><b>${project.name.toUpperCase()} - BRIEFING</b></p>`,
      x: frameX,
      y: headerY,
      width: contentWidth,
      height: 36,
      style: {
        fillColor: '#000000',
        borderColor: 'transparent',
        borderWidth: 0,
        color: '#FFFFFF',
        fontSize: 13,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Project info row (badges style)
    // Sequence: Priority, Project Type, Status (left) + Due Date (right)
    const infoY = headerY + 42;

    // Badge dimensions and spacing
    const BADGE_HEIGHT = 26;
    const BADGE_GAP = 16; // Professional spacing between badges
    const BADGE_WIDTHS = { priority: 70, type: 100, status: 90, date: 100 };

    // Calculate positions with equal gaps (left side)
    let badgeX = left + BRIEFING.PADDING + BADGE_WIDTHS.priority / 2;

    // 1. Priority badge
    await miro.board.createShape({
      shape: 'round_rectangle',
      content: `<p><b>${project.priority.toUpperCase()}</b></p>`,
      x: badgeX,
      y: infoY,
      width: BADGE_WIDTHS.priority,
      height: BADGE_HEIGHT,
      style: {
        fillColor: normalizeMiroColor(PRIORITY_COLORS[project.priority], '#6B7280'),
        borderColor: 'transparent',
        borderWidth: 0,
        color: '#FFFFFF',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Move to next badge position
    badgeX += BADGE_WIDTHS.priority / 2 + BADGE_GAP + BADGE_WIDTHS.type / 2;

    // 2. Project Type badge (dark background, white text)
    const projectType = getProjectTypeFromBriefing(briefing);
    await miro.board.createShape({
      shape: 'round_rectangle',
      content: `<p><b>${(projectType?.label || 'Project').toUpperCase()}</b></p>`,
      x: badgeX,
      y: infoY,
      width: BADGE_WIDTHS.type,
      height: BADGE_HEIGHT,
      style: {
        fillColor: '#000000',
        borderColor: 'transparent',
        borderWidth: 0,
        color: '#FFFFFF',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Move to next badge position
    badgeX += BADGE_WIDTHS.type / 2 + BADGE_GAP + BADGE_WIDTHS.status / 2;

    // 3. Status badge (synced with project status from DB/timeline)
    const statusConfig = getStatusConfig(project.status);
    const statusBadge = await miro.board.createShape({
      shape: 'round_rectangle',
      content: `<p><b>${statusConfig.label.toUpperCase()}</b></p>`,
      x: badgeX,
      y: infoY,
      width: BADGE_WIDTHS.status,
      height: BADGE_HEIGHT,
      style: {
        fillColor: statusConfig.color,
        borderColor: 'transparent',
        borderWidth: 0,
        color: '#FFFFFF',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });
    statusBadgeId = statusBadge.id;

    // 4. Due Date badge (right side, light gray background)
    const right = frameX + FRAME.WIDTH / 2;
    const dueDateBadgeX = right - BRIEFING.PADDING - BADGE_WIDTHS.date / 2;
    await miro.board.createShape({
      shape: 'round_rectangle',
      content: `<p><b>${dueDateText}</b></p>`,
      x: dueDateBadgeX,
      y: infoY,
      width: BADGE_WIDTHS.date,
      height: BADGE_HEIGHT,
      style: {
        fillColor: '#E5E7EB',
        borderColor: 'transparent',
        borderWidth: 0,
        color: '#374151',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // === FORM GRID (top ~40%) ===
    const formStartY = infoY + 25;
    const { COLS, ROWS, CELL_WIDTH, CELL_HEIGHT, CELL_GAP } = BRIEFING.FORM;
    const gridWidth = COLS * CELL_WIDTH + (COLS - 1) * CELL_GAP;
    const gridStartX = frameX - gridWidth / 2 + CELL_WIDTH / 2;

    for (const field of BRIEFING_FIELDS) {
      const cellX = gridStartX + field.col * (CELL_WIDTH + CELL_GAP);
      const cellY = formStartY + field.row * (CELL_HEIGHT + CELL_GAP) + CELL_HEIGHT / 2;

      const value = briefing[field.key];
      const hasValue = Boolean(value);
      // Show full text - Miro shapes handle overflow automatically
      const display = hasValue && value ? value : 'NEEDS ATTENTION!';

      // Create section title (bold, above the container)
      // Title positioned 8px above the content frame for professional spacing
      const frameTopY = cellY - 5; // Content frame center position
      const frameHeight = CELL_HEIGHT - 20;
      const titleY = frameTopY - frameHeight / 2 - 8; // 8px gap above frame

      await miro.board.createText({
        content: `<b>${field.label}</b>`,
        x: cellX,
        y: titleY,
        width: CELL_WIDTH,
        style: {
          color: '#6B7280',
          fontSize: 9,
          textAlign: 'left',
        },
      });

      // Create content container with border
      // All fields have light gray border, empty fields show "NEEDS ATTENTION!" in red text
      const shape = await miro.board.createShape({
        shape: 'rectangle',
        content: hasValue ? `<p>${display}</p>` : `<p><b>${display}</b></p>`,
        x: cellX,
        y: frameTopY,
        width: CELL_WIDTH,
        height: frameHeight,
        style: {
          fillColor: hasValue ? '#FFFFFF' : '#FEE2E2',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          color: hasValue ? '#000000' : '#EF4444',
          fontSize: 10,
          textAlign: hasValue ? 'left' : 'center',
          textAlignVertical: hasValue ? 'top' : 'middle',
        },
      });

      items.push({ id: crypto.randomUUID(), miroItemId: shape.id, fieldKey: field.key });
    }

    // === CREATIVE DIRECTION & FILE ASSETS (bottom ~50%, split evenly) ===
    const formBottom = formStartY + ROWS * CELL_HEIGHT + (ROWS - 1) * CELL_GAP + 15;
    const totalBottomHeight = (top + FRAME.HEIGHT - BRIEFING.PADDING) - formBottom - 25;
    const sectionHeight = (totalBottomHeight - 30) / 2; // Split between 2 sections with gap
    const headerHeight = 24;

    // Helper to send shape to back
    const sendToBack = async (shape: { id: string }) => {
      try {
        await (shape as unknown as { sendToBack: () => Promise<void> }).sendToBack();
      } catch {
        try {
          await (miro.board as unknown as { sendToBack: (item: unknown) => Promise<void> }).sendToBack(shape);
        } catch {
          // If sendToBack isn't available, content may overlap
        }
      }
    };

    // === CREATIVE DIRECTION ===
    // Creative Direction drop zone FIRST (so it's behind)
    const creativeDropZoneY = formBottom + headerHeight + 5 + (sectionHeight - headerHeight) / 2;
    const creativeDropZone = await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: frameX,
      y: creativeDropZoneY,
      width: contentWidth - 10,
      height: sectionHeight - headerHeight - 10,
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
      },
    });
    await sendToBack(creativeDropZone);

    // Creative header (clean gray) - created after so it's on top
    await miro.board.createShape({
      shape: 'rectangle',
      content: '<p><b>CREATIVE DIRECTION</b></p>',
      x: frameX,
      y: formBottom + 12,
      width: contentWidth,
      height: headerHeight,
      style: {
        fillColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        color: '#374151',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // === FILE ASSETS ===
    const fileAssetsStartY = formBottom + sectionHeight + 15;

    // File Assets drop zone FIRST (so it's behind)
    const fileAssetsDropZoneY = fileAssetsStartY + headerHeight + 5 + (sectionHeight - headerHeight) / 2;
    const fileAssetsDropZone = await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: frameX,
      y: fileAssetsDropZoneY,
      width: contentWidth - 10,
      height: sectionHeight - headerHeight - 10,
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
      },
    });
    await sendToBack(fileAssetsDropZone);

    // File Assets header (clean gray) - created after so it's on top
    await miro.board.createShape({
      shape: 'rectangle',
      content: '<p><b>FILE ASSETS</b></p>',
      x: frameX,
      y: fileAssetsStartY + 12,
      width: contentWidth,
      height: headerHeight,
      style: {
        fillColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        color: '#374151',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    return { items, statusBadgeId };
  }

  private async createVersionContent(x: number, y: number, num: number): Promise<void> {
    const miro = getMiroSDK();
    const top = y - FRAME.HEIGHT / 2;
    const bottom = y + FRAME.HEIGHT / 2;
    const contentWidth = FRAME.WIDTH - 40;
    const headerHeight = 24;
    const padding = BRIEFING.PADDING;

    // Work area FIRST (clean, minimalist - fills remaining space matching briefing bottom sections)
    // Created first so it's behind everything else
    const workAreaTop = top + padding + headerHeight + 10;
    const workAreaBottom = bottom - padding;
    const workAreaHeight = workAreaBottom - workAreaTop;
    const workAreaY = workAreaTop + workAreaHeight / 2;

    const workArea = await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x,
      y: workAreaY,
      width: contentWidth - 10,
      height: workAreaHeight,
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
      },
    });

    // Send work area to back so any content added later appears in front
    try {
      await (workArea as unknown as { sendToBack: () => Promise<void> }).sendToBack();
    } catch {
      // Fallback: try board method if item method fails
      try {
        await (miro.board as unknown as { sendToBack: (item: unknown) => Promise<void> }).sendToBack(workArea);
      } catch {
        // If sendToBack isn't available, the item will still work but may need manual layering
        log('MiroProject', 'sendToBack not available, work area may overlap content');
      }
    }

    // Header SECOND (clean gray, matching briefing section headers)
    // Created after work area so it appears on top
    await miro.board.createShape({
      shape: 'rectangle',
      content: `<p><b>VERSION ${num}</b></p>`,
      x,
      y: top + padding + headerHeight / 2,
      width: contentWidth,
      height: headerHeight,
      style: {
        fillColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        color: '#374151',
        fontSize: 10,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });
  }

  /**
   * Update the status badge in the briefing frame
   * Called when project status changes in the panel
   * Searches for the badge on the board if not in memory
   */
  async updateBriefingStatus(projectId: string, status: ProjectStatus, projectName?: string): Promise<boolean> {
    projectLogger.debug('[updateBriefingStatus] Starting update', { project: projectName || projectId, status });

    const miro = getMiroSDK();
    const statusConfig = getStatusConfig(status);
    const row = this.rows.get(projectId);

    projectLogger.debug('[updateBriefingStatus] Status config', { label: statusConfig.label, hasRowInMemory: !!row });

    // Try using stored ID first
    if (row?.statusBadgeId) {
      try {
        const shape = await miro.board.getById(row.statusBadgeId);
        if (shape && 'content' in shape) {
          (shape as { content: string }).content = `<p><b>${statusConfig.label}</b></p>`;
          if ('style' in shape && shape.style) {
            (shape.style as { fillColor: string }).fillColor = statusConfig.color;
          }
          await miro.board.sync(shape);
          log('MiroProject', `Updated status badge for project ${projectId} to ${status} (using stored ID)`);
          return true;
        }
      } catch {
        log('MiroProject', `Stored badge ID invalid, searching on board...`);
      }
    }

    // Search for the badge on the board by finding briefing frame and status shape
    try {
      projectLogger.debug('[updateBriefingStatus] Searching for status badge', { project: projectName || projectId });

      let briefingFrame: MiroFrame | undefined;

      // First try using stored briefingFrameId from memory
      if (row?.briefingFrameId) {
        try {
          const frame = await miro.board.getById(row.briefingFrameId) as MiroFrame;
          if (frame) {
            projectLogger.debug('[updateBriefingStatus] Using stored briefingFrameId', { id: row.briefingFrameId });
            briefingFrame = frame;
          }
        } catch {
          projectLogger.debug('[updateBriefingStatus] Stored briefingFrameId invalid, searching');
        }
      }

      // If not found in memory, search all frames
      if (!briefingFrame) {
        const allFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
        projectLogger.debug('[updateBriefingStatus] Found frames on board', { count: allFrames.length });

        // Try exact match by project name (format: "Project Name - BRIEFING [PROJ-YYYY-MM-XXX]")
        if (projectName) {
          briefingFrame = allFrames.find(f => {
            if (!f.title) return false;
            const isBriefing = f.title.toUpperCase().includes('BRIEFING');
            if (!isBriefing) return false;
            return f.title.toUpperCase().startsWith(projectName.toUpperCase() + ' -');
          });
        }

        if (briefingFrame) {
          projectLogger.debug('[updateBriefingStatus] Found by project name', { title: briefingFrame.title });
        }

        // Fallback: contains (for partial matches)
        if (!briefingFrame && projectName) {
          briefingFrame = allFrames.find(f => {
            if (!f.title) return false;
            const isBriefing = f.title.toUpperCase().includes('BRIEFING');
            const matchesProject = f.title.toUpperCase().includes(projectName.toUpperCase());
            return isBriefing && matchesProject;
          });
        }
      }

      if (!briefingFrame) {
        projectLogger.debug('[updateBriefingStatus] No briefing frame found', { project: projectName || projectId });
        return false;
      }

      projectLogger.debug('[updateBriefingStatus] Found briefing frame', { title: briefingFrame.title });

      // Get all shapes on the board
      const allShapes = await miro.board.get({ type: 'shape' }) as Array<{
        id: string;
        x: number;
        y: number;
        content?: string;
        style?: { fillColor?: string };
      }>;

      // Find shapes that are inside the briefing frame
      const frameLeft = briefingFrame.x - (briefingFrame.width || 800) / 2;
      const frameRight = briefingFrame.x + (briefingFrame.width || 800) / 2;
      const frameTop = briefingFrame.y - (briefingFrame.height || 600) / 2;
      const frameBottom = briefingFrame.y + (briefingFrame.height || 600) / 2;

      const shapesInFrame = allShapes.filter(s => {
        return s.x >= frameLeft && s.x <= frameRight && s.y >= frameTop && s.y <= frameBottom;
      });

      projectLogger.debug('[updateBriefingStatus] Found shapes inside frame', { count: shapesInFrame.length });

      // Priority labels that should NOT be considered as status badges
      const PRIORITY_LABELS = ['URGENT', 'HIGH', 'MEDIUM', 'STANDARD'];
      // Status labels - these are the actual status values (pure = not shared with priority)
      const PURE_STATUS_LABELS = ['CRITICAL', 'OVERDUE', 'ON TRACK', 'IN PROGRESS', 'REVIEW', 'DONE'];

      // Filter shapes with content for debugging
      const shapesWithContent = shapesInFrame.filter(s => s.content && s.content.length > 0);
      projectLogger.debug('[updateBriefingStatus] Shapes with content', { count: shapesWithContent.length });

      // Find all shapes that could be badges - look for shapes in a horizontal line (same Y)
      // Group shapes by Y position (within tolerance) to find the badge row
      const yGroups: Map<number, typeof shapesWithContent> = new Map();
      for (const shape of shapesWithContent) {
        // Round Y to nearest 10 to group nearby shapes
        const roundedY = Math.round(shape.y / 10) * 10;
        const group = yGroups.get(roundedY) || [];
        group.push(shape);
        yGroups.set(roundedY, group);
      }

      // Find the row with the most badge-like shapes (should be 5 badges)
      // The badge row is near the top and has multiple items
      let badgeRow: typeof shapesWithContent = [];
      let badgeRowY = 0;
      for (const [y, group] of yGroups) {
        // Badge row should have 3-6 items and be in top half of frame
        if (group.length >= 3 && group.length <= 7 && y < frameTop + (frameBottom - frameTop) / 3) {
          if (group.length > badgeRow.length) {
            badgeRow = group;
            badgeRowY = y;
          }
        }
      }

      projectLogger.debug('[updateBriefingStatus] Found badge row', { y: badgeRowY, count: badgeRow.length });

      // Sort badges by X position (left to right)
      badgeRow.sort((a, b) => a.x - b.x);

      // Sort badges by X position (left to right)
      projectLogger.debug('[updateBriefingStatus] Badges sorted left-to-right', { count: badgeRow.length });

      let statusShape: typeof shapesInFrame[0] | undefined;

      // Strategy 1: Find status badge by matching PURE status labels (not shared with priority)
      // Look in the badge row first
      if (badgeRow.length > 0) {
        statusShape = badgeRow.find(s => {
          const content = (s.content || '').toUpperCase();
          // Must match a pure status label AND not match a priority label
          const matchesStatus = PURE_STATUS_LABELS.some(label => content.includes(label));
          const matchesPriority = PRIORITY_LABELS.some(label => content.includes(label));
          return matchesStatus && !matchesPriority;
        });
        if (statusShape) {
          projectLogger.debug('[updateBriefingStatus] Strategy 1: Found pure status label');
        }
      }

      // Strategy 2: Use the 3rd badge from left (position-based)
      // Badge order: Priority (1st), Project Type (2nd), Status (3rd), Author (4th), Due Date (5th)
      if (!statusShape && badgeRow.length >= 3) {
        const thirdBadge = badgeRow[2];
        if (thirdBadge) {
          projectLogger.debug('[updateBriefingStatus] Strategy 2: Using 3rd badge');
          statusShape = thirdBadge;
        }
      }

      // Strategy 3: Find by unique status color (colors not shared with priority)
      if (!statusShape && badgeRow.length > 0) {
        // These colors are ONLY used by status badges, not priority badges
        const uniqueStatusColors = ['#3B82F6', '#A855F7', '#3B82F6', '#10B981', '#EF4444'];
        statusShape = badgeRow.find(s => {
          const fillColor = s.style?.fillColor?.toUpperCase();
          return fillColor && uniqueStatusColors.some(c => c.toUpperCase() === fillColor);
        });
        if (statusShape) {
          projectLogger.debug('[updateBriefingStatus] Strategy 3: Found by unique color', { color: statusShape.style?.fillColor });
        }
      }

      // Strategy 4: LAST RESORT - search all shapes for pure status labels only
      if (!statusShape) {
        projectLogger.debug('[updateBriefingStatus] Strategy 4: Searching all shapes for pure status labels');
        statusShape = shapesWithContent.find(s => {
          const content = (s.content || '').toUpperCase();
          // Only match pure status labels that are NOT also priority labels
          const matchesPureStatus = PURE_STATUS_LABELS.some(label => content.includes(label));
          const matchesPriority = PRIORITY_LABELS.some(label => content.includes(label));
          return matchesPureStatus && !matchesPriority;
        });
      }

      if (statusShape) {
        projectLogger.debug('[updateBriefingStatus] Found status shape', { x: Math.round(statusShape.x) });

        // Update the shape
        const shape = await miro.board.getById(statusShape.id);
        if (shape && 'content' in shape) {
          (shape as { content: string }).content = `<p><b>${statusConfig.label}</b></p>`;
          if ('style' in shape && shape.style) {
            (shape.style as { fillColor: string }).fillColor = statusConfig.color;
          }
          await miro.board.sync(shape);

          // Store the ID for future updates
          if (row) {
            row.statusBadgeId = statusShape.id;
          }

          projectLogger.info('[updateBriefingStatus] SUCCESS - Updated status badge', { label: statusConfig.label });

          // Handle done overlay
          await this.handleDoneOverlay(projectId, status, briefingFrame);

          return true;
        }
      } else {
        projectLogger.debug('[updateBriefingStatus] No status shape found in briefing frame');
      }

      // Even if we didn't find status shape, handle the done overlay if we found the frame
      if (briefingFrame) {
        await this.handleDoneOverlay(projectId, status, briefingFrame);
      }
    } catch (error) {
      projectLogger.error('[updateBriefingStatus] ERROR', error);
    }

    return false;
  }

  /**
   * Update the due date badge in the briefing frame
   * Called when admin edits the due date
   */
  async updateBriefingDueDate(projectId: string, dueDate: string | null, projectName?: string): Promise<boolean> {
    projectLogger.debug('[updateBriefingDueDate] Starting update', { project: projectName || projectId, dueDate });

    const miro = getMiroSDK();
    const row = this.rows.get(projectId);

    // Format the due date text
    const dueDateText = dueDate
      ? new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No deadline';

    projectLogger.debug('[updateBriefingDueDate] Formatted date', { dueDateText });

    // Search for the badge on the board by finding briefing frame and due date shape
    try {
      let briefingFrame: MiroFrame | undefined;

      // First try using stored briefingFrameId from memory
      if (row?.briefingFrameId) {
        try {
          const frame = await miro.board.getById(row.briefingFrameId) as MiroFrame;
          if (frame) {
            projectLogger.debug('[updateBriefingDueDate] Using stored briefingFrameId', { id: row.briefingFrameId });
            briefingFrame = frame;
          }
        } catch {
          projectLogger.debug('[updateBriefingDueDate] Stored briefingFrameId invalid, searching');
        }
      }

      // If not found in memory, search all frames
      if (!briefingFrame) {
        const allFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
        projectLogger.debug('[updateBriefingDueDate] Found frames on board', { count: allFrames.length });

        // Try exact match by project name (format: "Project Name - BRIEFING [PROJ-YYYY-MM-XXX]")
        if (projectName) {
          briefingFrame = allFrames.find(f => {
            if (!f.title) return false;
            const isBriefing = f.title.toUpperCase().includes('BRIEFING');
            if (!isBriefing) return false;
            return f.title.toUpperCase().startsWith(projectName.toUpperCase() + ' -');
          });
        }

        // Fallback: contains (for partial matches)
        if (!briefingFrame && projectName) {
          briefingFrame = allFrames.find(f => {
            if (!f.title) return false;
            const isBriefing = f.title.toUpperCase().includes('BRIEFING');
            const matchesProject = f.title.toUpperCase().includes(projectName.toUpperCase());
            return isBriefing && matchesProject;
          });
        }
      }

      if (!briefingFrame) {
        projectLogger.debug('[updateBriefingDueDate] No briefing frame found', { project: projectName || projectId });
        return false;
      }

      projectLogger.debug('[updateBriefingDueDate] Found briefing frame', { title: briefingFrame.title });

      // Get all shapes on the board
      const allShapes = await miro.board.get({ type: 'shape' }) as Array<{
        id: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        content?: string;
        style?: { fillColor?: string };
      }>;

      // Find shapes that are inside the briefing frame
      const frameLeft = briefingFrame.x - (briefingFrame.width || 800) / 2;
      const frameRight = briefingFrame.x + (briefingFrame.width || 800) / 2;
      const frameTop = briefingFrame.y - (briefingFrame.height || 600) / 2;
      const frameBottom = briefingFrame.y + (briefingFrame.height || 600) / 2;

      const shapesInFrame = allShapes.filter(s => {
        return s.x >= frameLeft && s.x <= frameRight && s.y >= frameTop && s.y <= frameBottom;
      });

      projectLogger.debug('[updateBriefingDueDate] Shapes in frame', { count: shapesInFrame.length });

      // Helper to normalize Miro fill colors for comparison (handles #hex, hex, lowercase)
      const normColor = (c?: string) => (c || '').replace('#', '').toLowerCase();
      const DUE_DATE_FILL_NORM = normColor('#E5E7EB'); // e5e7eb

      // Log fill colors of shapes in top area for debugging
      const topShapes = shapesInFrame.filter(s =>
        s.y < frameTop + (frameBottom - frameTop) / 3 && s.content && s.content.length > 0
      );
      projectLogger.debug('[updateBriefingDueDate] Top-area shapes', {
        count: topShapes.length,
        fills: topShapes.map(s => ({ fill: s.style?.fillColor, content: s.content?.substring(0, 30), x: Math.round(s.x) })),
      });

      // Strategy 1: Find the due date badge by its unique gray fill color (#E5E7EB)
      let dueDateShape = shapesInFrame.find(s =>
        normColor(s.style?.fillColor) === DUE_DATE_FILL_NORM &&
        s.content && s.content.length > 0
      );

      // Strategy 2: Find by content pattern (date text or "No deadline")
      if (!dueDateShape) {
        const datePattern = /<p><b>(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|No deadline|Due:)/i;
        dueDateShape = shapesInFrame.find(s => s.content && datePattern.test(s.content));
        if (!dueDateShape) {
          // Also try without HTML tags (Miro might strip them)
          const plainDatePattern = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}|No deadline/i;
          dueDateShape = shapesInFrame.find(s => s.content && plainDatePattern.test(s.content));
        }
      }

      // Strategy 3: Find the rightmost small shape in the top area (badge row)
      if (!dueDateShape) {
        const topAreaShapes = shapesInFrame.filter(s =>
          s.content && s.content.length > 0 &&
          s.y < frameTop + (frameBottom - frameTop) / 3 &&
          (s.width ?? 200) <= 130 && (s.height ?? 50) <= 40
        );
        if (topAreaShapes.length > 0) {
          topAreaShapes.sort((a, b) => b.x - a.x); // rightmost first
          dueDateShape = topAreaShapes[0];
        }
      }

      if (dueDateShape) {
        projectLogger.debug('[updateBriefingDueDate] Found due date shape', {
          strategy: normColor(dueDateShape.style?.fillColor) === DUE_DATE_FILL_NORM ? 'fillColor' : 'fallback',
          x: Math.round(dueDateShape.x),
          currentContent: dueDateShape.content?.substring(0, 50),
        });

        const shape = await miro.board.getById(dueDateShape.id);
        if (shape && 'content' in shape) {
          (shape as { content: string }).content = `<p><b>${dueDateText}</b></p>`;
          await miro.board.sync(shape);
          projectLogger.info('[updateBriefingDueDate] SUCCESS - Updated due date badge', { dueDateText });
          return true;
        }
      }

      projectLogger.debug('[updateBriefingDueDate] No due date shape found in briefing frame');
    } catch (error) {
      projectLogger.error('[updateBriefingDueDate] ERROR', error);
    }

    return false;
  }

  /**
   * Handle the gray "done" overlay on the briefing frame
   * Creates a semi-transparent gray overlay when status is "done", removes it otherwise
   */
  private async handleDoneOverlay(
    projectId: string,
    status: ProjectStatus,
    briefingFrame: MiroFrame
  ): Promise<void> {
    const miro = getMiroSDK();
    const row = this.rows.get(projectId);
    const isDone = status === 'done';

    projectLogger.debug('[handleDoneOverlay]', { status, isDone, hasOverlayId: !!row?.doneOverlayId });

    // If status is done, create or keep the overlay
    if (isDone) {
      // Check if overlay already exists
      if (row?.doneOverlayId) {
        try {
          const existing = await miro.board.getById(row.doneOverlayId);
          if (existing) {
            projectLogger.debug('[handleDoneOverlay] Overlay already exists');
            return;
          }
        } catch {
          // Overlay doesn't exist anymore, will create new one
        }
      }

      // Create the green overlay with transparency
      const frameWidth = briefingFrame.width || FRAME.WIDTH;
      const frameHeight = briefingFrame.height || FRAME.HEIGHT;

      projectLogger.debug('[handleDoneOverlay] Creating semi-transparent gray overlay', { frameTitle: briefingFrame.title });

      // Using fillOpacity for real transparency so content is still visible
      // Note: fillOpacity is supported by Miro SDK but not in the TypeScript types
      const overlay = await miro.board.createShape({
        shape: 'rectangle',
        x: briefingFrame.x,
        y: briefingFrame.y,
        width: frameWidth - 20, // Slightly smaller than frame
        height: frameHeight - 20,
        style: {
          fillColor: '#9CA3AF', // Gray color (same as completed cards in panel)
          fillOpacity: 0.3, // 30% opacity - visible but content still readable
          borderWidth: 0,
        } as { fillColor: string; fillOpacity: number; borderWidth: number },
      });

      projectLogger.debug('[handleDoneOverlay] Created overlay', { overlayId: overlay.id });

      // Store the overlay ID in the row if it exists
      if (row) {
        row.doneOverlayId = overlay.id;
      }
    } else {
      // Status is not done, remove overlay if it exists
      if (row?.doneOverlayId) {
        try {
          projectLogger.debug('[handleDoneOverlay] Removing overlay', { overlayId: row.doneOverlayId });
          await safeRemove(row.doneOverlayId);
          delete row.doneOverlayId;
          projectLogger.debug('[handleDoneOverlay] Overlay removed');
        } catch (error) {
          projectLogger.error('[handleDoneOverlay] Failed to remove overlay', error);
        }
      } else {
        // Try to find and remove overlay by searching shapes in the frame area
        try {
          const allShapes = await miro.board.get({ type: 'shape' }) as Array<{
            id: string;
            x: number;
            y: number;
            width?: number;
            height?: number;
            style?: { fillColor?: string; fillOpacity?: number };
          }>;

          const frameWidth = briefingFrame.width || FRAME.WIDTH;
          const frameHeight = briefingFrame.height || FRAME.HEIGHT;

          // Find large overlay rectangles at the frame position (checking for both old green and new gray)
          const overlayShape = allShapes.find(s => {
            const isAtFrameCenter = Math.abs(s.x - briefingFrame.x) < 50 && Math.abs(s.y - briefingFrame.y) < 50;
            const isLarge = (s.width || 0) > frameWidth * 0.8 && (s.height || 0) > frameHeight * 0.8;
            const fillColor = s.style?.fillColor?.toUpperCase();
            // Check for both legacy green overlays and current gray overlay
            const isGreen = fillColor === '#10B981' || fillColor === '#D1FAE5' || fillColor === '#D1FAE5';
            const isGray = fillColor === '#9CA3AF';
            return isAtFrameCenter && isLarge && (isGreen || isGray);
          });

          if (overlayShape) {
            projectLogger.debug('[handleDoneOverlay] Found orphan overlay, removing', { overlayId: overlayShape.id });
            await safeRemove(overlayShape.id);
          }
        } catch {
          // Ignore errors when searching for orphan overlays
        }
      }
    }
  }

  getProjectRow(projectId: string): ExtendedProjectRow | undefined {
    return this.rows.get(projectId);
  }

  async removeProjectRow(projectId: string): Promise<void> {
    const row = this.rows.get(projectId);
    if (!row) return;

    // Remove briefing frame
    if (row.briefingFrameId) {
      await safeRemove(row.briefingFrameId);
    }

    // Remove all version frames
    for (const version of row.versions) {
      await safeRemove(version.frameId);
    }

    this.rows.delete(projectId);
    log('MiroProject', `Removed project row: ${projectId}`);
  }

  getAllProjectRows(): ExtendedProjectRow[] {
    return Array.from(this.rows.values());
  }

  // Reset the service state (for dev tools)
  reset(): void {
    this.rows.clear();
    this.baseX = 0;
    this.nextY = 0;
    this.initialized = false;
    this.projectsHeaderCreated = false;
    log('MiroProject', 'Service reset');
  }
}

// Export singletons
export const miroTimelineService = new MiroMasterTimelineService();
export const miroProjectRowService = new MiroProjectRowService();

export async function addVersionToProject(projectId: string, projectName?: string) {
  return miroProjectRowService.addVersion(projectId, projectName);
}

export async function zoomToProject(projectId: string): Promise<boolean> {
  const miro = getMiroSDK();
  const row = miroProjectRowService.getProjectRow(projectId);
  if (!row) return false;

  try {
    const ids = [row.briefingFrameId, ...row.versions.map(s => s.frameId)].filter((id): id is string => id !== null);
    const items = [];
    for (const id of ids) {
      try {
        const item = await miro.board.getById(id);
        if (item) items.push(item);
      } catch {
        // Item may have been deleted - continue with remaining items
      }
    }
    if (items.length) {
      await miro.board.viewport.zoomTo(items);
      return true;
    }
  } catch {
    // Silently fail if zoom fails
  }
  return false;
}
