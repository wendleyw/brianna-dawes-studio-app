/**
 * Miro SDK v2 Service
 *
 * LAYOUT: Timeline Master on LEFT, Projects on RIGHT (side by side)
 *
 * ┌─────────────────────────────┐     ┌────────────────────┬────────────────────┐
 * │ ⭐ MASTER PROJECT TIMELINE  │     │  Project 1         │  Project 1         │
 * │                             │     │  BRIEFING          │  STAGE 1           │
 * │ ┌─────┬─────┬─────┬─────┐  │     └────────────────────┴────────────────────┘
 * │ │CRIT │OVER │URG  │ON   │  │
 * │ ├─────┼─────┼─────┼─────┤  │     ┌────────────────────┬────────────────────┐
 * │ │PROG │REV  │DONE │     │  │     │  Project 2         │  Project 2         │
 * │ └─────┴─────┴─────┴─────┘  │     │  BRIEFING          │  STAGE 1           │
 * │                             │     └────────────────────┴────────────────────┘
 * │  ┌─────────────────────┐   │
 * │  │ Project Card        │   │     ┌────────────────────┬────────────────────┐
 * │  │ Project Card        │   │     │  Project 3         │  Project 3         │
 * │  └─────────────────────┘   │     │  BRIEFING          │  STAGE 1           │
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
import type { MiroFrame, MiroCard } from '../context/MiroContext';

// Import centralized constants
import {
  FRAME,
  TIMELINE,
  BRIEFING,
  TITLE,
  PRIORITY_COLORS,
  TIMELINE_COLUMNS,
  BRIEFING_FIELDS,
  PROJECT_TYPE_CONFIG,
} from './constants';
import { createLogger } from '@shared/lib/logger';

// Create namespaced loggers for different services
const timelineLogger = createLogger('MiroTimeline');
const projectLogger = createLogger('MiroProject');

// ==================== HELPER FUNCTIONS ====================

/** Prefixed logger for Miro services - uses unified logger */
function log(prefix: string, message: string, data?: unknown): void {
  const logger = prefix === 'MiroTimeline' ? timelineLogger : projectLogger;
  logger.debug(message, data);
}

function getMiroSDK() {
  if (typeof window === 'undefined' || !window.miro) {
    throw new Error('Miro SDK not available. Make sure you are running inside Miro.');
  }
  return window.miro;
}

/**
 * Find timeline frame on the board by title or dimensions
 */
async function findTimelineFrame(): Promise<MiroFrame | null> {
  const miro = getMiroSDK();
  const existingFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];

  const timelineFrame = existingFrames.find(f =>
    f.title?.includes('MASTER TIMELINE') ||
    f.title?.includes('Timeline Master') ||
    (f.width && f.height && Math.abs(f.width - TIMELINE.FRAME_WIDTH) < 10 && Math.abs(f.height - TIMELINE.FRAME_HEIGHT) < 10)
  );

  return timelineFrame || null;
}

/**
 * Safely remove a Miro board item by ID (with error handling)
 */
async function safeRemove(id: string): Promise<boolean> {
  try {
    await getMiroSDK().board.remove({ id });
    return true;
  } catch (error) {
    log('MiroService', `Failed to remove item ${id}`, error);
    return false;
  }
}

// Map project status to timeline status - direct since DB now has 7 statuses
function getTimelineStatus(project: { status: ProjectStatus }): ProjectStatus {
  return project.status;
}

// Get status color from timeline columns configuration
function getStatusConfig(status: ProjectStatus): { label: string; color: string } {
  const column = TIMELINE_COLUMNS.find(c => c.id === status);
  if (column) {
    return { label: column.label, color: column.color };
  }
  // Default fallback
  return { label: status.toUpperCase().replace('_', ' '), color: '#6B7280' };
}

// Extract project type from briefing timeline
function getProjectTypeFromBriefing(briefing: ProjectBriefing): { label: string; color: string; icon: string } | null {
  const timeline = briefing.timeline || '';

  // Try to match project type from timeline string (format: "Website UI Design (45 days) - Target: ...")
  for (const [key, config] of Object.entries(PROJECT_TYPE_CONFIG)) {
    if (timeline.toLowerCase().includes(key) ||
        timeline.toLowerCase().includes(config.label.toLowerCase())) {
      return config;
    }
  }

  // Try to match longer label variations
  if (timeline.includes('Website UI Design')) return PROJECT_TYPE_CONFIG['website-ui-design'] || null;
  if (timeline.includes('Marketing Campaign')) return PROJECT_TYPE_CONFIG['marketing-campaign'] || null;
  if (timeline.includes('Video Production')) return PROJECT_TYPE_CONFIG['video-production'] || null;
  if (timeline.includes('Email Design')) return PROJECT_TYPE_CONFIG['email-design'] || null;
  if (timeline.includes('Social Post')) return PROJECT_TYPE_CONFIG['social-post-carousel'] || null;

  return null;
}

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

  isInitialized(): boolean {
    return this.initialized && this.state !== null;
  }

  async initializeTimeline(): Promise<MasterTimelineState> {
    // SINGLETON: Return existing if initialized in memory
    if (this.initialized && this.state) {
      log('MiroTimeline', 'Already initialized in memory, reusing');
      return this.state;
    }

    const miro = getMiroSDK();

    // Check if timeline already exists on the board
    const existingTimeline = await findTimelineFrame();

    if (existingTimeline) {
      log('MiroTimeline', 'Found existing timeline on board', existingTimeline.id);

      // Restore state from existing timeline
      this.frameCenterX = existingTimeline.x;
      this.frameCenterY = existingTimeline.y;

      // Create column state
      const columns: TimelineColumn[] = this.calculateColumnPositions();

      this.state = {
        frameId: existingTimeline.id,
        columns,
        cards: [],
        lastSyncAt: new Date().toISOString(),
      };

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

    // Create timeline frame with white background (no title in frame itself)
    const frame = await miro.board.createFrame({
      title: '',
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

      // Header with color (no border)
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>${col.label}</b></p>`,
        x: colX,
        y: statusHeaderY,
        width: TIMELINE.COLUMN_WIDTH,
        height: TIMELINE.HEADER_HEIGHT,
        style: {
          fillColor: col.color,
          borderColor: 'transparent',
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
        color: col.color,
        x: colX,
        y: dropZoneTopY, // Store TOP of drop zone for card placement
        width: TIMELINE.COLUMN_WIDTH,
      });
    }

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
   */
  private calculateColumnPositions(): TimelineColumn[] {
    const frameLeft = this.frameCenterX - TIMELINE.FRAME_WIDTH / 2;
    const frameTop = this.frameCenterY - TIMELINE.FRAME_HEIGHT / 2;

    const startX = frameLeft + TIMELINE.PADDING;
    const statusHeaderY = frameTop + TIMELINE.PADDING + TIMELINE.HEADER_HEIGHT / 2;
    const dropZoneTopY = statusHeaderY + TIMELINE.HEADER_HEIGHT / 2 + 5;

    const columns: TimelineColumn[] = [];

    // All 7 columns in one row
    for (let i = 0; i < TIMELINE_COLUMNS.length; i++) {
      const col = TIMELINE_COLUMNS[i];
      if (!col) continue;

      const colX = startX + TIMELINE.COLUMN_WIDTH / 2 + i * (TIMELINE.COLUMN_WIDTH + TIMELINE.COLUMN_GAP);
      columns.push({
        id: col.id,
        label: col.label,
        color: col.color,
        x: colX,
        y: dropZoneTopY, // TOP of drop zone
        width: TIMELINE.COLUMN_WIDTH,
      });
    }

    return columns;
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
      return await this._syncProjectInternal(project, options);
    } finally {
      this.syncingProjects.delete(project.id);
      // Release the lock for next sync
      resolveMyLock();
    }
  }

  private async _syncProjectInternal(project: Project, options?: { markAsReviewed?: boolean }): Promise<TimelineCard> {
    if (!this.state) throw new Error('Timeline not initialized');

    const miro = getMiroSDK();
    const status = getTimelineStatus(project);
    const column = this.state.columns.find(c => c.id === status);
    if (!column) throw new Error(`Column ${status} not found`);

    console.log('[MiroTimeline] Syncing project:', project.name, '(', project.id, ') to status:', status);

    // STEP 1: Get all cards from board
    let allBoardCards: MiroCard[] = [];
    try {
      allBoardCards = await miro.board.get({ type: 'card' }) as MiroCard[];
      log('MiroTimeline', `Found ${allBoardCards.length} total cards on board`);
    } catch (e) {
      log('MiroTimeline', 'Failed to get board cards', e);
    }

    // STEP 1.5: Check if card was reviewed - DB is source of truth
    // markAsReviewed option is used when client explicitly marks as reviewed
    // project.wasReviewed comes from DB and is reset when status changes back to 'review'
    const wasReviewed = options?.markAsReviewed || project.wasReviewed || false;
    const existingCard = allBoardCards.find(c => c.description?.includes(`projectId:${project.id}`));
    log('MiroTimeline', `Review status: wasReviewed=${wasReviewed} (from DB/options)`)

    // Format due date with days left
    const formatDueDate = (dateStr: string | null): string => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (diffDays < 0) return `${formatted} · ${Math.abs(diffDays)}d late`;
      if (diffDays === 0) return `${formatted} · Today`;
      if (diffDays <= 7) return `${formatted} · ${diffDays}d`;
      return formatted;
    };

    // Build priority indicator with colored circles
    const priorityIcon = project.priority === 'urgent' ? '🔴 ' :
                         project.priority === 'high' ? '🟠 ' :
                         project.priority === 'medium' ? '🟡 ' :
                         '🟢 '; // low/standard

    // Build clean card title - simple 3-line layout
    // Line 1: Priority icon + Project Name
    // Line 2: Client/Author name
    // Line 3: Due date with countdown
    const reviewedPrefix = wasReviewed ? '✓ ' : '';
    const projectTitle = `${priorityIcon}${reviewedPrefix}${project.name}`;
    const authorLine = project.client?.name || '';
    const dateLine = formatDueDate(project.dueDate);

    const titleLines = [
      projectTitle,
      authorLine,
      dateLine,
    ].filter(Boolean);

    const title = titleLines.join('\n');

    // Build description with reviewed flag
    const description = `projectId:${project.id}${wasReviewed ? '|reviewed:true' : ''}`;

    // STEP 2: Find existing card BY PROJECTID IN DESCRIPTION (works across iframe contexts)
    // This is the source of truth - search on the actual board, not memory
    let existingCardOnBoard: MiroCard | undefined = existingCard;
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
    // Count cards in the column, excluding the current project's card
    const columnX = column.x;
    const columnY = column.y ?? 0;
    const columnWidth = column.width ?? TIMELINE.COLUMN_WIDTH;

    // Get this project's card ID (prefer board truth, then memory)
    const thisProjectCardId = existingCardOnBoard?.id || existingInMemory?.miroCardId;

    // Find all cards physically in this column's X range (excluding current project's card)
    const cardsInColumnOnBoard = allBoardCards.filter(c => {
      // Must be within column X range
      const inColumnX = Math.abs(c.x - columnX) < columnWidth / 2;
      // Must not be this project's card (by ID)
      const notThisProjectCard = c.id !== thisProjectCardId;
      return inColumnX && notThisProjectCard;
    });

    console.log('[MiroTimeline] Found', cardsInColumnOnBoard.length, 'other cards in column', status);

    const cardX = columnX;
    const firstCardY = columnY + 10 + TIMELINE.CARD_HEIGHT / 2;
    const cardY = firstCardY + cardsInColumnOnBoard.length * (TIMELINE.CARD_HEIGHT + TIMELINE.CARD_GAP);

    console.log('[MiroTimeline] Card position:', { cardX, cardY, firstCardY, columnY });

    // STEP 5: Update or create card
    // Use the card found on board (source of truth) or memory as fallback
    const existingMiroCardId = existingCardOnBoard?.id || existingInMemory?.miroCardId;

    if (existingMiroCardId) {
      try {
        const item = await miro.board.getById(existingMiroCardId) as MiroCard;
        if (item) {
          // Move the card to new position and update style
          item.title = title;
          item.description = description; // Ensure projectId is stored
          item.x = cardX;
          item.y = cardY;
          item.style = { cardTheme: column.color };
          await miro.board.sync(item);

          log('MiroTimeline', `MOVED card ${existingMiroCardId} to ${status} at Y=${cardY}`);

          // Update memory state
          if (existingInMemory) {
            existingInMemory.status = status;
            existingInMemory.x = cardX;
            existingInMemory.y = cardY;
            existingInMemory.projectName = project.name;
            existingInMemory.clientName = project.client?.name || null;
            existingInMemory.miroCardId = existingMiroCardId;
          }

          return existingInMemory || {
            id: crypto.randomUUID(),
            projectId: project.id,
            projectName: project.name,
            clientName: project.client?.name || null,
            dueDate: project.dueDate,
            status,
            miroCardId: existingMiroCardId,
            x: cardX,
            y: cardY,
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
        // Update the existing card instead of creating a new one
        existingCardFinalCheck.title = title;
        existingCardFinalCheck.description = description;
        existingCardFinalCheck.x = cardX;
        existingCardFinalCheck.y = cardY;
        existingCardFinalCheck.style = { cardTheme: column.color };
        await miro.board.sync(existingCardFinalCheck);

        const updatedCard: TimelineCard = {
          id: crypto.randomUUID(),
          projectId: project.id,
          projectName: project.name,
          clientName: project.client?.name || null,
          dueDate: project.dueDate,
          status,
          miroCardId: existingCardFinalCheck.id,
          x: cardX,
          y: cardY,
        };

        // Update memory state
        this.state.cards = this.state.cards.filter(c => c.projectId !== project.id);
        this.state.cards.push(updatedCard);

        return updatedCard;
      }
    } catch (e) {
      log('MiroTimeline', 'Final check for existing card failed, proceeding with create', e);
    }

    log('MiroTimeline', `Creating NEW card for "${project.name}" at position (${cardX}, ${cardY})`);
    const newMiroCard = await miro.board.createCard({
      title,
      description, // Store projectId in description for cross-context discovery
      x: cardX,
      y: cardY,
      width: TIMELINE.CARD_WIDTH,
      style: { cardTheme: column.color },
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
    return newCard;
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

interface StageState {
  stageNumber: number;
  frameId: string;
  centerX: number;
  centerY: number;
}

interface ExtendedProjectRow extends Omit<ProjectRowState, 'y' | 'processFrameId'> {
  stages: StageState[];
  rowY: number;
  clientName: string;
  processFrameId: string;
  y: number;
  statusBadgeId?: string; // ID of the status badge shape for updates
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

    // Get timeline position from the service
    let timelineRightEdge = miroTimelineService.getTimelineRightEdge();
    let timelineTopY = miroTimelineService.getTimelineTopY();

    // If timeline position is still 0, find it on the board
    if (timelineRightEdge === 0) {
      log('MiroProject', 'Timeline position is 0, scanning board...');

      const timelineFrame = await findTimelineFrame();

      if (timelineFrame) {
        const frameWidth = timelineFrame.width ?? TIMELINE.FRAME_WIDTH;
        const frameHeight = timelineFrame.height ?? TIMELINE.FRAME_HEIGHT;
        timelineRightEdge = timelineFrame.x + frameWidth / 2;
        timelineTopY = timelineFrame.y - frameHeight / 2;
        log('MiroProject', 'Found timeline on board', { rightEdge: timelineRightEdge, topY: timelineTopY });
      } else {
        // Fallback: use FIXED position (same as timeline fixed position)
        // Timeline is at (0, 0), so calculate from there
        const FIXED_TIMELINE_X = 0;
        const FIXED_TIMELINE_Y = 0;
        timelineRightEdge = FIXED_TIMELINE_X + TIMELINE.FRAME_WIDTH / 2;
        timelineTopY = FIXED_TIMELINE_Y - TIMELINE.FRAME_HEIGHT / 2;
        log('MiroProject', 'No timeline found, using FIXED position fallback');
      }
    }

    // Set base X to the RIGHT of timeline
    this.baseX = timelineRightEdge + TIMELINE.GAP_TO_PROJECTS + FRAME.WIDTH / 2;

    // Default: first project aligned with TOP of timeline
    this.nextY = timelineTopY + FRAME.HEIGHT / 2;

    log('MiroProject', 'Initialized positions', { baseX: this.baseX, nextY: this.nextY });

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
    } catch (e) {
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

    // Create Stage 1
    const stage1X = briefingX + FRAME.WIDTH + FRAME.GAP;
    const stage1Y = rowY;

    const stage1Frame = await miro.board.createFrame({
      title: `${project.name} - STAGE 1 ${projectTag}`,
      x: stage1X,
      y: stage1Y,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    await this.createStageContent(stage1X, stage1Y, 1);

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
      processFrameId: stage1Frame.id,
      y: rowY,
      briefingItems,
      processStages: [{ id: crypto.randomUUID(), miroItemId: stage1Frame.id, stageName: 'STAGE 1' }],
      stages: [{ stageNumber: 1, frameId: stage1Frame.id, centerX: stage1X, centerY: stage1Y }],
      rowY,
      ...(statusBadgeId ? { statusBadgeId } : {}),
    };

    this.rows.set(project.id, row);

    // Zoom to show both the Timeline and the new project frames
    const timelineFrameId = miroTimelineService.getState()?.frameId;
    const itemsToZoom = [briefingFrame, stage1Frame];
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

  async addStage(projectId: string, projectName?: string): Promise<StageState | null> {
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
          const titleMatch = f.title.match(/^(.+?)\s*-\s*(BRIEFING|STAGE)/);
          const frameProjName = titleMatch?.[1]?.trim();
          return frameProjName === searchName;
        });

        log('MiroProject', `Found ${projectFrames.length} frames for project "${searchName}"`);

        if (projectFrames.length > 0) {
          // Find all STAGE frames for this project
          const stageFrames = projectFrames
            .filter(f => f.title?.includes('- STAGE'))
            .sort((a, b) => a.x - b.x); // Sort by X position (left to right)

          if (stageFrames.length > 0) {
            // Extract project name from frame title: "Project Name - STAGE 1 [PROJ-2025-12-001]" -> "Project Name"
            const firstStageTitle = stageFrames[0]?.title || '';
            const extractedName = firstStageTitle.split(' - ')[0]?.trim() || projectName || 'Unknown';
            const firstStageFrame = stageFrames[0];

            // Reconstruct the row state
            const stages: StageState[] = stageFrames.map((f, idx) => ({
              stageNumber: idx + 1,
              frameId: f.id,
              centerX: f.x,
              centerY: f.y,
            }));

            row = {
              projectId,
              projectName: extractedName,
              clientName: 'Client',
              rowY: firstStageFrame?.y || 0,
              y: firstStageFrame?.y || 0,
              briefingFrameId: projectFrames.find(f => f.title?.includes('- BRIEFING'))?.id || '',
              processFrameId: firstStageFrame?.id || '',
              stages,
              briefingItems: [],
              processStages: stageFrames.map(f => ({
                id: crypto.randomUUID(),
                miroItemId: f.id,
                stageName: f.title?.split(' - ').pop()?.replace(/\s*\[.*\]$/, '') || 'STAGE',
              })),
            };

            this.rows.set(projectId, row);
            log('MiroProject', `Reconstructed row with ${stages.length} stages for project "${extractedName}"`);
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

    const num = row.stages.length + 1;
    const lastStage = row.stages[row.stages.length - 1];
    if (!lastStage) return null; // No existing stages to position from

    // Get the actual frame from the board to check its real width (in case client expanded it)
    let actualLastFrameWidth: number = FRAME.WIDTH;
    let actualLastFrameX: number = lastStage.centerX;

    try {
      const lastFrame = await miro.board.getById(lastStage.frameId) as { x: number; width: number } | null;
      if (lastFrame) {
        actualLastFrameWidth = lastFrame.width || FRAME.WIDTH;
        actualLastFrameX = lastFrame.x;
        log('MiroProject', `Last stage frame actual size: ${actualLastFrameWidth}x at X=${actualLastFrameX}`);
      }
    } catch (e) {
      log('MiroProject', 'Could not get last frame, using stored position', e);
    }

    // Calculate position based on the actual right edge of the previous frame
    const rightEdgeOfLastFrame = actualLastFrameX + actualLastFrameWidth / 2;
    const x = rightEdgeOfLastFrame + FRAME.GAP + FRAME.WIDTH / 2;
    const y = row.rowY;

    log('MiroProject', `Creating STAGE ${num} at X=${x} (right edge of prev: ${rightEdgeOfLastFrame})`);

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
      title: `${row.projectName} - STAGE ${num} ${projectTag}`.trim(),
      x, y,
      width: FRAME.WIDTH,
      height: FRAME.HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    await this.createStageContent(x, y, num);

    const stage: StageState = { stageNumber: num, frameId: frame.id, centerX: x, centerY: y };
    row.stages.push(stage);
    row.processStages.push({ id: crypto.randomUUID(), miroItemId: frame.id, stageName: `STAGE ${num}` });

    await miro.board.viewport.zoomTo([frame]);
    return stage;
  }

  getStageCount(projectId: string): number {
    return this.rows.get(projectId)?.stages.length || 0;
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
    const dueDateText = project.dueDate
      ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No deadline';

    // Header background (dark, no border)
    await miro.board.createShape({
      shape: 'rectangle',
      content: `<p><b>${project.name.toUpperCase()} - BRIEFING</b></p>`,
      x: frameX,
      y: headerY,
      width: contentWidth,
      height: 36,
      style: {
        fillColor: '#1F2937',
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
    const BADGE_GAP = 8;
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
        fillColor: PRIORITY_COLORS[project.priority] || '#6B7280',
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
        fillColor: '#1F2937',
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
      await miro.board.createText({
        content: `<b>${field.label}</b>`,
        x: cellX,
        y: cellY - CELL_HEIGHT / 2 + 8,
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
        y: cellY + 15,
        width: CELL_WIDTH,
        height: CELL_HEIGHT - 30,
        style: {
          fillColor: hasValue ? '#FFFFFF' : '#FEF2F2',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          color: hasValue ? '#1F2937' : '#EF4444',
          fontSize: 10,
          textAlign: hasValue ? 'left' : 'center',
          textAlignVertical: hasValue ? 'top' : 'middle',
        },
      });

      items.push({ id: crypto.randomUUID(), miroItemId: shape.id, fieldKey: field.key });
    }

    // === CREATIVE DIRECTION (bottom ~50%) ===
    const formBottom = formStartY + ROWS * CELL_HEIGHT + (ROWS - 1) * CELL_GAP + 15;
    const creativeHeight = (top + FRAME.HEIGHT - BRIEFING.PADDING) - formBottom - 25;

    // Creative header (clean gray)
    await miro.board.createShape({
      shape: 'rectangle',
      content: '<p><b>CREATIVE DIRECTION</b></p>',
      x: frameX,
      y: formBottom + 12,
      width: contentWidth,
      height: 24,
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

    // Large image drop zone (clean white with gray border)
    const dropZoneY = formBottom + 25 + creativeHeight / 2;
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: frameX,
      y: dropZoneY,
      width: contentWidth - 10,
      height: creativeHeight - 15,
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
      },
    });

    return { items, statusBadgeId };
  }

  private async createStageContent(x: number, y: number, num: number): Promise<void> {
    const miro = getMiroSDK();
    const top = y - FRAME.HEIGHT / 2;
    const contentWidth = FRAME.WIDTH - 40;

    // Header (minimalist)
    await miro.board.createShape({
      shape: 'rectangle',
      content: `<p><b>STAGE ${num}</b></p>`,
      x,
      y: top + 30,
      width: contentWidth,
      height: 36,
      style: {
        fillColor: '#1F2937',
        color: '#FFFFFF',
        fontSize: 13,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Work area (clean, minimalist)
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x,
      y: y + 15,
      width: contentWidth,
      height: FRAME.HEIGHT - 100,
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
      },
    });
  }

  /**
   * Update the status badge in the briefing frame
   * Called when project status changes in the panel
   * Searches for the badge on the board if not in memory
   */
  async updateBriefingStatus(projectId: string, status: ProjectStatus, projectName?: string): Promise<boolean> {
    // Use console.log directly for debugging (bypasses production log filtering)
    console.log('[MiroProject] [updateBriefingStatus] Starting update for project:', projectName || projectId, 'new status:', status);

    const miro = getMiroSDK();
    const statusConfig = getStatusConfig(status);
    const row = this.rows.get(projectId);

    console.log('[MiroProject] [updateBriefingStatus] Status config:', statusConfig, 'has row in memory:', !!row);

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
      console.log('[MiroProject] [updateBriefingStatus] Searching for status badge on board for project:', projectName || projectId);

      let briefingFrame: MiroFrame | undefined;

      // First try using stored briefingFrameId from memory
      if (row?.briefingFrameId) {
        try {
          const frame = await miro.board.getById(row.briefingFrameId) as MiroFrame;
          if (frame) {
            console.log('[MiroProject] [updateBriefingStatus] Using stored briefingFrameId:', row.briefingFrameId);
            briefingFrame = frame;
          }
        } catch {
          console.log('[MiroProject] [updateBriefingStatus] Stored briefingFrameId invalid, searching...');
        }
      }

      // If not found in memory, search all frames
      if (!briefingFrame) {
        const allFrames = await miro.board.get({ type: 'frame' }) as MiroFrame[];
        console.log('[MiroProject] [updateBriefingStatus] Found', allFrames.length, 'frames on board');

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
          console.log('[MiroProject] [updateBriefingStatus] Found by project name:', briefingFrame.title);
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
        console.log('[MiroProject] [updateBriefingStatus] No briefing frame found for project:', projectName || projectId);
        return false;
      }

      console.log('[MiroProject] [updateBriefingStatus] Found briefing frame:', briefingFrame.title);

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

      console.log('[MiroProject] [updateBriefingStatus] Found', shapesInFrame.length, 'shapes inside frame');

      // Priority labels that should NOT be considered as status badges
      const PRIORITY_LABELS = ['URGENT', 'HIGH', 'MEDIUM', 'STANDARD'];
      // Status labels - these are the actual status values (pure = not shared with priority)
      const PURE_STATUS_LABELS = ['CRITICAL', 'OVERDUE', 'ON TRACK', 'IN PROGRESS', 'REVIEW', 'DONE'];

      // Log all shapes with content for debugging
      const shapesWithContent = shapesInFrame.filter(s => s.content && s.content.length > 0);
      console.log('[MiroProject] [updateBriefingStatus] Shapes with content:', shapesWithContent.map(s => ({
        x: Math.round(s.x),
        y: Math.round(s.y),
        content: s.content?.replace(/<[^>]*>/g, '').substring(0, 15),
        color: s.style?.fillColor
      })));

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

      console.log('[MiroProject] [updateBriefingStatus] Found badge row at Y=', badgeRowY, 'with', badgeRow.length, 'items');

      // Sort badges by X position (left to right)
      badgeRow.sort((a, b) => a.x - b.x);

      // Log badges in order for debugging
      console.log('[MiroProject] [updateBriefingStatus] Badges left-to-right:', badgeRow.map(s => ({
        x: Math.round(s.x),
        content: s.content?.replace(/<[^>]*>/g, '').substring(0, 15)
      })));

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
          console.log('[MiroProject] [updateBriefingStatus] Strategy 1: Found pure status label');
        }
      }

      // Strategy 2: Use the 3rd badge from left (position-based)
      // Badge order: Priority (1st), Project Type (2nd), Status (3rd), Author (4th), Due Date (5th)
      if (!statusShape && badgeRow.length >= 3) {
        const thirdBadge = badgeRow[2];
        if (thirdBadge) {
          console.log('[MiroProject] [updateBriefingStatus] Strategy 2: Using 3rd badge:', thirdBadge.content);
          statusShape = thirdBadge;
        }
      }

      // Strategy 3: Find by unique status color (colors not shared with priority)
      if (!statusShape && badgeRow.length > 0) {
        // These colors are ONLY used by status badges, not priority badges
        const uniqueStatusColors = ['#3B82F6', '#8B5CF6', '#6366F1', '#22C55E', '#EAB308'];
        statusShape = badgeRow.find(s => {
          const fillColor = s.style?.fillColor?.toUpperCase();
          return fillColor && uniqueStatusColors.some(c => c.toUpperCase() === fillColor);
        });
        if (statusShape) {
          console.log('[MiroProject] [updateBriefingStatus] Strategy 3: Found by unique color:', statusShape.style?.fillColor);
        }
      }

      // Strategy 4: LAST RESORT - search all shapes for pure status labels only
      if (!statusShape) {
        console.log('[MiroProject] [updateBriefingStatus] Strategy 4: Searching all shapes for pure status labels');
        statusShape = shapesWithContent.find(s => {
          const content = (s.content || '').toUpperCase();
          // Only match pure status labels that are NOT also priority labels
          const matchesPureStatus = PURE_STATUS_LABELS.some(label => content.includes(label));
          const matchesPriority = PRIORITY_LABELS.some(label => content.includes(label));
          return matchesPureStatus && !matchesPriority;
        });
      }

      if (statusShape) {
        console.log('[MiroProject] [updateBriefingStatus] Found status shape:', statusShape.content, 'at X:', Math.round(statusShape.x));

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

          console.log('[MiroProject] [updateBriefingStatus] SUCCESS - Updated status badge to:', statusConfig.label);
          return true;
        }
      } else {
        console.log('[MiroProject] [updateBriefingStatus] No status shape found in briefing frame');
      }
    } catch (error) {
      console.error('[MiroProject] [updateBriefingStatus] ERROR:', error);
    }

    return false;
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

    // Remove all stage frames
    for (const stage of row.stages) {
      await safeRemove(stage.frameId);
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

export async function addStageToProject(projectId: string, projectName?: string) {
  return miroProjectRowService.addStage(projectId, projectName);
}

export function getProjectStageCount(projectId: string): number {
  return miroProjectRowService.getStageCount(projectId);
}

export async function zoomToProject(projectId: string): Promise<boolean> {
  const miro = getMiroSDK();
  const row = miroProjectRowService.getProjectRow(projectId);
  if (!row) return false;

  try {
    const ids = [row.briefingFrameId, ...row.stages.map(s => s.frameId)].filter((id): id is string => id !== null);
    const items = [];
    for (const id of ids) {
      try { const item = await miro.board.getById(id); if (item) items.push(item); } catch {}
    }
    if (items.length) {
      await miro.board.viewport.zoomTo(items);
      return true;
    }
  } catch {}
  return false;
}
