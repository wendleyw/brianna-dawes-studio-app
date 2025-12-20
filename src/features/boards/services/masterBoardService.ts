/**
 * Master Board Service
 *
 * Manages a consolidated "Master Board" that displays all clients
 * with their projects organized in vertical frames with mini-kanbans.
 */

import { miroClient } from './miroClient';
import { supabase } from '@shared/lib/supabase';
import { miroAdapter } from '@shared/lib/miroAdapter';
import { createLogger } from '@shared/lib/logger';
import type { ClientAnalytics } from '@features/admin/domain/analytics.types';

const logger = createLogger('MasterBoard');

// Layout constants for the Master Board - matching main timeline style
const MASTER_BOARD = {
  // Title area (above frame)
  TITLE_Y: -50,

  // Frame dimensions (similar to main timeline)
  FRAME_WIDTH: 1000,
  FRAME_HEIGHT: 600,
  FRAME_GAP: 100, // Gap between client frames vertically

  // Internal layout
  PADDING: 20,
  HEADER_HEIGHT: 60, // Client info header

  // Kanban columns (matching main timeline style)
  COLUMN_WIDTH: 180,
  COLUMN_GAP: 12,
  COLUMN_HEADER_HEIGHT: 32,
  COLUMN_HEIGHT: 450,

  // Cards - larger to fit detailed info
  CARD_WIDTH: 170,
  CARD_HEIGHT: 90,  // Taller cards for more info
  CARD_GAP: 12,
};

// Status columns matching main timeline (5 columns)
const STATUS_COLUMNS = [
  { id: 'overdue', label: 'OVERDUE', color: 'var(--priority-high)' },
  { id: 'urgent', label: 'URGENT', color: 'var(--color-error)' },
  { id: 'in_progress', label: 'IN PROGRESS', color: 'var(--color-accent-light)' },
  { id: 'review', label: 'REVIEW', color: 'var(--color-info)' },
  { id: 'done', label: 'DONE', color: 'var(--color-success)' },
] as const;

// Map project status to kanban column (matching main timeline)
function getColumnForStatus(status: string): string {
  switch (status) {
    case 'overdue':
    case 'critical':
      return 'overdue';
    case 'urgent':
      return 'urgent';
    case 'in_progress':
    case 'on_track':
    case 'draft':
      return 'in_progress';
    case 'review':
      return 'review';
    case 'done':
    case 'archived':
      return 'done';
    default:
      return 'in_progress';
  }
}

// Get card color based on status (hex colors matching STATUS_COLUMNS)
function getCardTheme(status: string): string {
  switch (status) {
    case 'critical':
    case 'overdue':
      return 'var(--priority-high)'; // Orange - OVERDUE
    case 'urgent':
      return 'var(--color-error)'; // Red - URGENT
    case 'in_progress':
    case 'on_track':
    case 'draft':
      return 'var(--color-accent-light)'; // Blue - IN PROGRESS
    case 'review':
      return 'var(--color-info)'; // Indigo - REVIEW
    case 'done':
    case 'archived':
      return 'var(--color-success)'; // Green - DONE
    default:
      return 'var(--color-accent-light)'; // Blue - default
  }
}

/**
 * Normalize date to YYYY-MM-DD format required by Miro SDK
 * Handles ISO 8601 dates, timestamps, and various formats
 */
function normalizeDateToYYYYMMDD(dateStr: string | null): string | null {
  if (!dateStr) return null;

  try {
    // Try to parse the date
    const date = new Date(dateStr);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    // Format as YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  } catch {
    return null;
  }
}

interface ProjectInfo {
  id: string;
  name: string;
  status: string;
  dueDate: string | null;
  priority: string | null;
  clientName: string | null;
  designerNames: string[];
  projectType: string | null;
}

interface ClientWithProjects extends ClientAnalytics {
  projects: ProjectInfo[];
}

export interface MasterBoardSyncResult {
  success: boolean;
  clientsProcessed: number;
  errors: string[];
  lastSyncAt: string;
}

class MasterBoardService {
  /**
   * Set the Miro access token for API calls
   */
  setAccessToken(token: string) {
    miroClient.setAccessToken(token);
  }

  /**
   * Validate that a board exists and is accessible
   */
  async validateBoard(boardId: string): Promise<{ valid: boolean; name?: string; error?: string }> {
    try {
      const board = await miroClient.getBoard(boardId);
      return { valid: true, name: board.name };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to access board',
      };
    }
  }

  /**
   * Initialize the master board with title and warning message
   * NOTE: This REST API method requires OAuth token. Use initializeMasterBoardWithSdk instead.
   */
  async initializeMasterBoard(boardId: string): Promise<void> {
    // Create main title
    await miroClient.createText(boardId, {
      content: '<b>MASTER OVERVIEW</b>',
      x: MASTER_BOARD.FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y - 30,
      width: 400,
      style: {
        fontSize: '24',
        textAlign: 'center',
        color: 'var(--color-primary)',
      },
    });

    // Create warning message
    await miroClient.createText(boardId, {
      content: '⚠️ Auto-updated - Do not edit manually',
      x: MASTER_BOARD.FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y + 10,
      width: 400,
      style: {
        fontSize: '12',
        textAlign: 'center',
        color: 'var(--color-gray-500)',
      },
    });
  }

  /**
   * Get all clients with their projects (with pagination support)
   *
   * @param options.page - Page number (1-indexed)
   * @param options.pageSize - Number of clients per page
   * @param options.onlyWithProjects - Only return clients with projects
   */
  private async getClientsWithProjects(options?: {
    page?: number;
    pageSize?: number;
    onlyWithProjects?: boolean;
  }): Promise<ClientWithProjects[]> {
    const { page = 1, pageSize = 50, onlyWithProjects = false } = options || {};
    const offset = (page - 1) * pageSize;

    // Get clients with pagination
    const clientsQuery = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: clients, error: clientsError, count: totalClients } = await clientsQuery;

    if (clientsError) {
      logger.error('Failed to fetch clients', { error: clientsError });
      return [];
    }

    if (!clients || clients.length === 0) return [];

    logger.debug('Fetched clients', {
      page,
      pageSize,
      fetched: clients.length,
      total: totalClients
    });

    // Get client IDs for filtering
    const clientIds = clients.map(c => c.id);

    // Fetch projects (with briefing), deliverables, and project designers in parallel
    const [projectsResult, deliverablesResult, projectDesignersResult] = await Promise.allSettled([
      supabase
        .from('projects')
        .select('id, name, status, due_date, client_id, priority, briefing')
        .in('client_id', clientIds),
      supabase
        .from('deliverables')
        .select('project_id, status'),
      supabase
        .from('project_designers')
        .select('project_id, users!inner(name)'),
    ]);

    // Extract data with error handling
    const projects = projectsResult.status === 'fulfilled'
      ? projectsResult.value.data || []
      : [];
    const deliverables = deliverablesResult.status === 'fulfilled'
      ? deliverablesResult.value.data || []
      : [];
    const projectDesigners = projectDesignersResult.status === 'fulfilled'
      ? projectDesignersResult.value.data || []
      : [];

    if (projectsResult.status === 'rejected') {
      logger.warn('Failed to fetch projects', { error: projectsResult.reason });
    }
    if (deliverablesResult.status === 'rejected') {
      logger.warn('Failed to fetch deliverables', { error: deliverablesResult.reason });
    }
    if (projectDesignersResult.status === 'rejected') {
      logger.warn('Failed to fetch project designers', { error: projectDesignersResult.reason });
    }

    // Build client analytics with projects
    const results = clients.map((client) => {
      const clientProjects = projects.filter((p) => p.client_id === client.id);
      const projectIds = clientProjects.map((p) => p.id);
      const clientDeliverables = deliverables.filter((d) => projectIds.includes(d.project_id));

      const activeStatuses = ['in_progress', 'review', 'on_track', 'urgent', 'critical', 'overdue'];

      return {
        id: client.id,
        name: client.name as string,
        email: client.email as string,
        companyName: client.company_name as string | null,
        avatarUrl: client.avatar_url as string | null,
        totalProjects: clientProjects.length,
        activeProjects: clientProjects.filter((p) => activeStatuses.includes(p.status)).length,
        completedProjects: clientProjects.filter((p) => p.status === 'done').length,
        totalDeliverables: clientDeliverables.length,
        approvedDeliverables: clientDeliverables.filter((d) => d.status === 'approved').length,
        planId: client.subscription_plan_id as string | null,
        planName: null,
        deliverablesUsed: (client.deliverables_used as number) || 0,
        deliverablesLimit: 0,
        usagePercentage: 0,
        joinedAt: client.created_at as string,
        lastProjectAt: clientProjects[0]?.id ? clientProjects[0].id : null,
        projects: clientProjects.map((p) => {
          // Get designer names for this project
          // Note: Supabase joins return users as an object (not array) with inner join
          const designers = projectDesigners
            .filter((pd: { project_id: string }) => pd.project_id === p.id)
            .map((pd: { users: { name: string } | { name: string }[] }) => {
              // Handle both object and array formats from Supabase
              const user = Array.isArray(pd.users) ? pd.users[0] : pd.users;
              return user?.name;
            })
            .filter(Boolean) as string[];

          // Extract project type from briefing JSONB
          const briefing = p.briefing as { projectType?: string } | null;

          return {
            id: p.id,
            name: p.name,
            status: p.status,
            dueDate: p.due_date,
            priority: p.priority || null,
            clientName: client.company_name || client.name,
            designerNames: designers,
            projectType: briefing?.projectType || null,
          };
        }),
      };
    });

    // Filter to only clients with projects if requested
    if (onlyWithProjects) {
      return results.filter(c => c.projects.length > 0);
    }

    return results;
  }

  /**
   * Get total count of clients
   */
  async getClientCount(): Promise<number> {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'client');

    if (error) {
      logger.error('Failed to get client count', { error });
      return 0;
    }

    return count || 0;
  }

  /**
   * Get all clients with projects using batch processing
   * For large datasets, this fetches clients in batches to avoid memory issues
   * @public - Exposed for testing and direct use
   */
  async getAllClientsWithProjectsBatched(batchSize = 50): Promise<ClientWithProjects[]> {
    const totalClients = await this.getClientCount();
    const totalPages = Math.ceil(totalClients / batchSize);

    logger.info('Fetching all clients in batches', {
      totalClients,
      batchSize,
      totalPages
    });

    const allClients: ClientWithProjects[] = [];

    for (let page = 1; page <= totalPages; page++) {
      const clients = await this.getClientsWithProjects({
        page,
        pageSize: batchSize,
        onlyWithProjects: true
      });
      allClients.push(...clients);

      logger.debug(`Processed batch ${page}/${totalPages}`, {
        batchSize: clients.length,
        total: allClients.length
      });
    }

    return allClients;
  }

  /**
   * Find existing client frame by client ID in title
   */
  private async findClientFrame(
    boardId: string,
    clientId: string
  ): Promise<{ id: string; y: number } | null> {
    const { data: frames } = await miroClient.getFrames(boardId);

    const clientFrame = frames.find((f) => f.data.title?.includes(`[${clientId}]`));

    if (clientFrame) {
      return { id: clientFrame.id, y: clientFrame.position.y };
    }
    return null;
  }

  /**
   * Calculate required height for a client frame based on projects
   */
  private calculateFrameHeight(projectCount: number): number {
    const maxProjectsInColumn = Math.ceil(projectCount / STATUS_COLUMNS.length);
    const projectsHeight = maxProjectsInColumn * (MASTER_BOARD.CARD_HEIGHT + MASTER_BOARD.CARD_GAP);
    const totalHeight =
      MASTER_BOARD.PADDING * 2 +
      MASTER_BOARD.HEADER_HEIGHT +
      MASTER_BOARD.COLUMN_HEADER_HEIGHT +
      projectsHeight +
      20; // Extra padding

    return Math.max(totalHeight, MASTER_BOARD.FRAME_HEIGHT);
  }

  /**
   * Create or update a client frame with mini-kanban
   */
  private async syncClientFrame(
    boardId: string,
    client: ClientWithProjects,
    yPosition: number
  ): Promise<{ frameId: string; height: number }> {
    const frameHeight = this.calculateFrameHeight(client.projects.length);
    const frameTitle = `${client.companyName || client.name} [${client.id}]`;

    // Try to find existing frame
    const existingFrame = await this.findClientFrame(boardId, client.id);

    let frameId: string;

    if (existingFrame) {
      // Update existing frame
      await miroClient.updateFrame(boardId, existingFrame.id, {
        title: frameTitle,
        y: yPosition,
        height: frameHeight,
      });
      frameId = existingFrame.id;

      // Delete existing content inside frame (cards, shapes, texts)
      await this.clearFrameContent(boardId, existingFrame.id, yPosition, frameHeight);
    } else {
      // Create new frame
      const frame = await miroClient.createFrame(boardId, {
        title: frameTitle,
        x: MASTER_BOARD.FRAME_WIDTH / 2,
        y: yPosition,
        width: MASTER_BOARD.FRAME_WIDTH,
        height: frameHeight,
        fillColor: 'var(--color-text-inverse)',
      });
      frameId = frame.id;
    }

    // Create header content
    await this.createClientHeader(boardId, client, yPosition);

    // Create mini-kanban columns and cards
    await this.createMiniKanban(boardId, client.projects, yPosition);

    return { frameId, height: frameHeight };
  }

  /**
   * Clear existing content inside a frame area
   */
  private async clearFrameContent(
    boardId: string,
    _frameId: string,
    frameY: number,
    frameHeight: number
  ): Promise<void> {
    // Get all cards in the board
    const { data: cards } = await miroClient.getCards(boardId);

    // Delete cards within the frame area
    const cardsInFrame = cards.filter((card) => {
      const cardY = card.position.y;
      return cardY >= frameY && cardY <= frameY + frameHeight;
    });

    for (const card of cardsInFrame) {
      try {
        await miroClient.deleteCard(boardId, card.id);
      } catch {
        // Ignore errors during cleanup
      }
    }
  }

  /**
   * Create client header with info and stats
   * NOTE: This REST API method requires OAuth token. Use SDK methods instead.
   */
  private async createClientHeader(
    boardId: string,
    client: ClientWithProjects,
    frameY: number
  ): Promise<void> {
    const headerY = frameY + MASTER_BOARD.PADDING + MASTER_BOARD.HEADER_HEIGHT / 2;
    const startX = MASTER_BOARD.PADDING;

    // Client name (large, bold)
    const displayName = client.companyName || client.name;
    await miroClient.createText(boardId, {
      content: `<b>${displayName}</b>`,
      x: startX + 150,
      y: headerY - 10,
      width: 300,
      style: {
        fontSize: '18',
        textAlign: 'left',
        color: 'var(--color-primary)',
      },
    });

    // Stats line
    const statsText = `${client.email}  |  ${client.totalProjects} Projects  |  ${client.activeProjects} Active  |  ${client.totalDeliverables} Deliverables`;
    await miroClient.createText(boardId, {
      content: statsText,
      x: startX + 350,
      y: headerY + 15,
      width: 600,
      style: {
        fontSize: '12',
        textAlign: 'left',
        color: 'var(--color-gray-500)',
      },
    });
  }

  /**
   * Create mini-kanban with status columns and project cards
   * NOTE: This REST API method requires OAuth token. Use SDK methods instead.
   */
  private async createMiniKanban(
    boardId: string,
    projects: ProjectInfo[],
    frameY: number
  ): Promise<void> {
    const kanbanStartY =
      frameY + MASTER_BOARD.PADDING + MASTER_BOARD.HEADER_HEIGHT + 20;
    const kanbanStartX = MASTER_BOARD.PADDING + 30;

    // Group projects by column
    const projectsByColumn: Record<string, ProjectInfo[]> = {
      overdue: [],
      urgent: [],
      in_progress: [],
      review: [],
      done: [],
    };

    projects.forEach((project) => {
      const column = getColumnForStatus(project.status);
      projectsByColumn[column]?.push(project);
    });

    // Create columns and cards
    for (let i = 0; i < STATUS_COLUMNS.length; i++) {
      const column = STATUS_COLUMNS[i];
      if (!column) continue;

      const columnX = kanbanStartX + i * (MASTER_BOARD.COLUMN_WIDTH + MASTER_BOARD.COLUMN_GAP);
      const columnProjects = projectsByColumn[column.id] || [];

      // Column header (rounded rectangle)
      await miroClient.createShape(boardId, {
        shape: 'round_rectangle',
        x: columnX + MASTER_BOARD.COLUMN_WIDTH / 2,
        y: kanbanStartY,
        width: MASTER_BOARD.COLUMN_WIDTH - 10,
        height: MASTER_BOARD.COLUMN_HEADER_HEIGHT,
        content: `${column.label} (${columnProjects.length})`,
        style: {
          fillColor: column.color,
          fontColor: 'var(--color-text-inverse)',
          fontSize: '12',
        },
      });

      // Project cards in this column
      for (let j = 0; j < columnProjects.length; j++) {
        const project = columnProjects[j];
        if (!project) continue;

        const cardY =
          kanbanStartY +
          MASTER_BOARD.COLUMN_HEADER_HEIGHT +
          15 +
          j * (MASTER_BOARD.CARD_HEIGHT + MASTER_BOARD.CARD_GAP);

        const cardData: {
          title: string;
          description: string;
          x: number;
          y: number;
          dueDate?: string;
          style: { cardTheme: string };
        } = {
          title: project.name,
          description: `projectId:${project.id}`,
          x: columnX + MASTER_BOARD.COLUMN_WIDTH / 2,
          y: cardY,
          style: {
            cardTheme: getCardTheme(project.status),
          },
        };

        const normalizedDueDate = normalizeDateToYYYYMMDD(project.dueDate);
        if (normalizedDueDate) {
          cardData.dueDate = normalizedDueDate;
        }

        await miroClient.createCard(boardId, cardData);
      }
    }
  }

  /**
   * Sync all clients to the master board
   */
  async syncAllClients(boardId: string): Promise<MasterBoardSyncResult> {
    const errors: string[] = [];
    let clientsProcessed = 0;

    try {
      // Get all clients with their projects
      const clients = await this.getClientsWithProjects();

      // Filter clients that have at least one project
      const clientsWithProjects = clients.filter((c) => c.projects.length > 0);

      if (clientsWithProjects.length === 0) {
        return {
          success: true,
          clientsProcessed: 0,
          errors: ['No clients with projects found'],
          lastSyncAt: new Date().toISOString(),
        };
      }

      // Calculate positions and create/update frames
      let currentY = 50; // Start below the title

      for (const client of clientsWithProjects) {
        try {
          const { height } = await this.syncClientFrame(boardId, client, currentY);
          currentY += height + MASTER_BOARD.FRAME_GAP;
          clientsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to sync client ${client.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      // Cleanup orphaned frames (clients that no longer exist)
      await this.cleanupOrphanedFrames(
        boardId,
        clientsWithProjects.map((c) => c.id)
      );

      return {
        success: errors.length === 0,
        clientsProcessed,
        errors,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        clientsProcessed,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        lastSyncAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Remove frames for clients that no longer exist
   */
  private async cleanupOrphanedFrames(boardId: string, currentClientIds: string[]): Promise<void> {
    const { data: frames } = await miroClient.getFrames(boardId);

    for (const frame of frames) {
      // Check if frame title contains a client ID marker
      const idMatch = frame.data.title?.match(/\[([a-f0-9-]+)\]/);
      if (idMatch) {
        const frameClientId = idMatch[1];
        if (frameClientId && !currentClientIds.includes(frameClientId)) {
          try {
            await miroClient.deleteFrame(boardId, frame.id);
          } catch {
            // Ignore errors during cleanup
          }
        }
      }
    }
  }

  /**
   * Get sync status from app_settings
   */
  async getSyncStatus(): Promise<{
    lastSyncAt: string | null;
    lastSyncResult: MasterBoardSyncResult | null;
  }> {
    // Use maybeSingle() instead of single() to avoid 406 error when row doesn't exist
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'master_board_sync_status')
      .maybeSingle();

    if (data?.value) {
      const value = data.value as { lastSyncAt?: string; lastSyncResult?: MasterBoardSyncResult };
      return {
        lastSyncAt: value.lastSyncAt || null,
        lastSyncResult: value.lastSyncResult || null,
      };
    }

    return { lastSyncAt: null, lastSyncResult: null };
  }

  /**
   * Save sync status to app_settings
   */
  async saveSyncStatus(result: MasterBoardSyncResult): Promise<void> {
    await supabase.from('app_settings').upsert(
      {
        key: 'master_board_sync_status',
        value: {
          lastSyncAt: result.lastSyncAt,
          lastSyncResult: result,
        },
        description: 'Last sync status for master board',
      },
      { onConflict: 'key' }
    );
  }

  // =====================================================
  // SDK-based methods (use when running inside the board)
  // =====================================================

  /**
   * Initialize the master board using Miro SDK
   * Must be called from within the Master Board context
   */
  async initializeMasterBoardWithSdk(_boardId: string): Promise<void> {
    if (!miroAdapter.isAvailable()) {
      throw new Error('Miro SDK not available. This must be run inside Miro.');
    }

    const miro = miroAdapter.getSDK();
    logger.info('Initializing master board');

    // Create main title (above frames)
    await miro.board.createText({
      content: '<b>MASTER OVERVIEW</b>',
      x: MASTER_BOARD.FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y - 30,
      width: 400,
      style: {
        fontSize: 24,
        textAlign: 'center',
        color: 'var(--color-primary)',
      },
    });

    // Create subtitle
    await miro.board.createText({
      content: '<i>⚠️ Auto-updated - Do not edit manually</i>',
      x: MASTER_BOARD.FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y + 10,
      width: 400,
      style: {
        fontSize: 12,
        textAlign: 'center',
        color: 'var(--color-gray-500)',
      },
    });
  }

  /**
   * Clear all existing content from the Master Board (SDK version)
   * Removes all frames, shapes, cards, and texts except the title
   */
  private async clearMasterBoardContentWithSdk(miro: ReturnType<typeof miroAdapter.getSDK>): Promise<void> {
    try {
      // Get all items on the board using Promise.allSettled to handle partial failures
      const fetchResults = await Promise.allSettled([
        miro.board.get({ type: 'frame' }),
        miro.board.get({ type: 'shape' }),
        miro.board.get({ type: 'card' }),
        miro.board.get({ type: 'text' }),
      ]);

      // Extract successful results, use empty arrays for failed fetches
      const frames = fetchResults[0].status === 'fulfilled' ? fetchResults[0].value : [];
      const shapes = fetchResults[1].status === 'fulfilled' ? fetchResults[1].value : [];
      const cards = fetchResults[2].status === 'fulfilled' ? fetchResults[2].value : [];
      const texts = fetchResults[3].status === 'fulfilled' ? fetchResults[3].value : [];

      // Log any fetch failures
      fetchResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          const types = ['frames', 'shapes', 'cards', 'texts'];
          logger.warn(`Failed to fetch ${types[index]}`, { error: result.reason });
        }
      });

      // Remove frames first (removes content inside them too)
      // Use Promise.allSettled for parallel removal with error tolerance
      if (frames.length > 0) {
        const frameResults = await Promise.allSettled(
          frames.map(frame => miro.board.remove(frame))
        );
        const failedFrames = frameResults.filter(r => r.status === 'rejected').length;
        if (failedFrames > 0) {
          logger.debug(`Failed to remove ${failedFrames} of ${frames.length} frames`);
        }
      }

      // Remove remaining shapes in parallel
      if (shapes.length > 0) {
        const shapeResults = await Promise.allSettled(
          shapes.map(shape => miro.board.remove(shape))
        );
        const failedShapes = shapeResults.filter(r => r.status === 'rejected').length;
        if (failedShapes > 0) {
          logger.debug(`Failed to remove ${failedShapes} of ${shapes.length} shapes`);
        }
      }

      // Remove remaining cards in parallel
      if (cards.length > 0) {
        const cardResults = await Promise.allSettled(
          cards.map(card => miro.board.remove(card))
        );
        const failedCards = cardResults.filter(r => r.status === 'rejected').length;
        if (failedCards > 0) {
          logger.debug(`Failed to remove ${failedCards} of ${cards.length} cards`);
        }
      }

      // Remove remaining texts in parallel
      if (texts.length > 0) {
        const textResults = await Promise.allSettled(
          texts.map(text => miro.board.remove(text))
        );
        const failedTexts = textResults.filter(r => r.status === 'rejected').length;
        if (failedTexts > 0) {
          logger.debug(`Failed to remove ${failedTexts} of ${texts.length} texts`);
        }
      }

      logger.info('Board content cleared', {
        frames: frames.length,
        shapes: shapes.length,
        cards: cards.length,
        texts: texts.length,
      });
    } catch (error) {
      logger.warn('Error during board cleanup', { error });
    }
  }

  /**
   * Sync all clients using Miro SDK
   * Must be called from within the Master Board context
   */
  async syncAllClientsWithSdk(_boardId: string): Promise<MasterBoardSyncResult> {
    if (!miroAdapter.isAvailable()) {
      throw new Error('Miro SDK not available. This must be run inside Miro.');
    }

    const miro = miroAdapter.getSDK();
    logger.info('Starting sync all clients with SDK');
    const errors: string[] = [];
    let clientsProcessed = 0;

    try {
      // Clear existing content before syncing
      await this.clearMasterBoardContentWithSdk(miro);

      // Recreate the title
      await miro.board.createText({
        content: '<b>MASTER OVERVIEW</b>',
        x: MASTER_BOARD.FRAME_WIDTH / 2,
        y: MASTER_BOARD.TITLE_Y - 30,
        width: 400,
        style: {
          fontSize: 24,
          textAlign: 'center',
          color: 'var(--color-primary)',
        },
      });

      await miro.board.createText({
        content: '<i>⚠️ Auto-updated - Do not edit manually</i>',
        x: MASTER_BOARD.FRAME_WIDTH / 2,
        y: MASTER_BOARD.TITLE_Y + 10,
        width: 400,
        style: {
          fontSize: 12,
          textAlign: 'center',
          color: 'var(--color-gray-500)',
        },
      });

      // Get all clients with their projects
      const clients = await this.getClientsWithProjects();

      // Filter clients that have at least one project
      const clientsWithProjects = clients.filter((c) => c.projects.length > 0);

      if (clientsWithProjects.length === 0) {
        return {
          success: true,
          clientsProcessed: 0,
          errors: ['No clients with projects found'],
          lastSyncAt: new Date().toISOString(),
        };
      }

      // Starting position for first client frame
      const startX = MASTER_BOARD.FRAME_WIDTH / 2;
      let currentY = 80; // Start below the title (increased from 50)

      for (const client of clientsWithProjects) {
        try {
          // Create client title (above frame, not inside)
          const displayName = client.companyName || client.name;
          const titleY = currentY - 25;

          await miro.board.createText({
            content: `<b>${displayName}</b>`,
            x: MASTER_BOARD.PADDING + 150,
            y: titleY,
            width: 400,
            style: {
              fontSize: 18,
              textAlign: 'left',
              color: 'var(--color-primary)',
            },
          });

          // Stats text (next to title)
          const statsText = `📧 ${client.email} | 📁 ${client.totalProjects} Projects | ✅ ${client.activeProjects} Active | 📦 ${client.totalDeliverables} Deliverables`;
          await miro.board.createText({
            content: statsText,
            x: startX + 100,
            y: titleY,
            width: 500,
            style: {
              fontSize: 11,
              textAlign: 'left',
              color: 'var(--color-gray-500)',
            },
          });

          // Create frame (no title in frame itself - cleaner look)
          const frame = await miro.board.createFrame({
            title: '', // Empty title - info is in text above
            x: startX,
            y: currentY + MASTER_BOARD.FRAME_HEIGHT / 2,
            width: MASTER_BOARD.FRAME_WIDTH,
            height: MASTER_BOARD.FRAME_HEIGHT,
            style: {
              fillColor: 'var(--color-text-inverse)',
            },
          });

          // Store client ID in frame metadata via description (for future sync)
          // We'll use a shape with the ID hidden inside the frame

          // Create kanban columns inside the frame
          await this.createKanbanColumnsWithSdk(miro, client.projects, startX, currentY, frame);

          currentY += MASTER_BOARD.FRAME_HEIGHT + MASTER_BOARD.FRAME_GAP;
          clientsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to sync client ${client.companyName || client.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      return {
        success: errors.length === 0,
        clientsProcessed,
        errors,
        lastSyncAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        clientsProcessed,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        lastSyncAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Create kanban columns with cards inside a client frame (SDK version)
   * Layout matches the main timeline style
   */
  private async createKanbanColumnsWithSdk(
    miro: typeof window.miro,
    projects: ProjectInfo[],
    frameCenterX: number,
    frameTopY: number,
    _frame: { id: string }
  ): Promise<void> {
    // Calculate frame bounds
    const frameLeft = frameCenterX - MASTER_BOARD.FRAME_WIDTH / 2;
    const frameTop = frameTopY;

    // Column positioning
    const totalColumnsWidth = STATUS_COLUMNS.length * MASTER_BOARD.COLUMN_WIDTH +
      (STATUS_COLUMNS.length - 1) * MASTER_BOARD.COLUMN_GAP;
    const columnsStartX = frameLeft + (MASTER_BOARD.FRAME_WIDTH - totalColumnsWidth) / 2;
    const headerY = frameTop + MASTER_BOARD.PADDING + MASTER_BOARD.COLUMN_HEADER_HEIGHT / 2;
    const dropZoneY = headerY + MASTER_BOARD.COLUMN_HEADER_HEIGHT / 2 + 10 + MASTER_BOARD.COLUMN_HEIGHT / 2;

    // Group projects by column
    const projectsByColumn: Record<string, ProjectInfo[]> = {
      overdue: [],
      urgent: [],
      in_progress: [],
      review: [],
      done: [],
    };

    projects.forEach((project) => {
      const column = getColumnForStatus(project.status);
      projectsByColumn[column]?.push(project);
    });

    // Create columns and cards
    for (let i = 0; i < STATUS_COLUMNS.length; i++) {
      const column = STATUS_COLUMNS[i];
      if (!column) continue;

      const columnX = columnsStartX + MASTER_BOARD.COLUMN_WIDTH / 2 + i * (MASTER_BOARD.COLUMN_WIDTH + MASTER_BOARD.COLUMN_GAP);
      const columnProjects = projectsByColumn[column.id] || [];

      // Column header (colored rounded rectangle)
      await miro.board.createShape({
        shape: 'round_rectangle',
        x: columnX,
        y: headerY,
        width: MASTER_BOARD.COLUMN_WIDTH,
        height: MASTER_BOARD.COLUMN_HEADER_HEIGHT,
        content: `<p><b>${column.label}</b></p>`,
        style: {
          fillColor: column.color,
          borderColor: 'transparent',
          borderWidth: 0,
          color: 'var(--color-text-inverse)',
          fontSize: 10,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });

      // Column drop zone (white rectangle with border)
      await miro.board.createShape({
        shape: 'rectangle',
        x: columnX,
        y: dropZoneY,
        width: MASTER_BOARD.COLUMN_WIDTH,
        height: MASTER_BOARD.COLUMN_HEIGHT,
        content: '',
        style: {
          fillColor: 'var(--color-text-inverse)',
          borderColor: 'var(--color-gray-200)',
          borderWidth: 1,
        },
      });

      // Project cards in this column
      const cardsStartY = headerY + MASTER_BOARD.COLUMN_HEADER_HEIGHT / 2 + 20 + MASTER_BOARD.CARD_HEIGHT / 2;

      for (let j = 0; j < columnProjects.length; j++) {
        const project = columnProjects[j];
        if (!project) continue;

        const cardY = cardsStartY + j * (MASTER_BOARD.CARD_HEIGHT + MASTER_BOARD.CARD_GAP);

        // Build detailed card title with all project info
        const priorityIcon = project.priority === 'urgent' ? '🔴' :
                             project.priority === 'high' ? '🟠' :
                             project.priority === 'medium' ? '🟡' : '🟢';

        // Format due date if present
        const formattedDueDate = project.dueDate
          ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : null;

        // Build multi-line title with all details
        const titleLines: string[] = [];

        // Line 1: Priority + Project Name
        titleLines.push(`${priorityIcon} ${project.name}`);

        // Line 2: Client (if different from frame client - always show for clarity)
        if (project.clientName) {
          titleLines.push(`👤 ${project.clientName}`);
        }

        // Line 3: Designers (first names only to save space)
        if (project.designerNames.length > 0) {
          const designerFirstNames = project.designerNames.map(n => n.split(' ')[0]).join(', ');
          titleLines.push(`👩‍🎨 ${designerFirstNames}`);
        }

        // Line 4: Due date + Type (combined to save space)
        const dueLine = [
          formattedDueDate ? `📅 ${formattedDueDate}` : null,
          project.projectType ? project.projectType.replace(/-/g, ' ') : null,
        ].filter(Boolean).join(' | ');

        if (dueLine) {
          titleLines.push(dueLine);
        }

        const cardTitle = titleLines.join('\n');

        // Build card data
        const cardData: {
          title: string;
          description: string;
          x: number;
          y: number;
          width: number;
          dueDate?: string;
          style: { cardTheme: string };
        } = {
          title: cardTitle,
          description: `projectId:${project.id}`,
          x: columnX,
          y: cardY,
          width: MASTER_BOARD.CARD_WIDTH,
          style: {
            cardTheme: getCardTheme(project.status),
          },
        };

        const normalizedDueDate = normalizeDateToYYYYMMDD(project.dueDate);
        if (normalizedDueDate) {
          cardData.dueDate = normalizedDueDate;
        }

        await miro.board.createCard(cardData);
      }
    }
  }

  // =====================================================
  // Architecture Diagram Generation
  // =====================================================

  /**
   * Generate a comprehensive architecture diagram of the entire app
   * Shows architecture layers AND complete user journey flows
   */
  async generateArchitectureDiagramWithSdk(): Promise<void> {
    if (typeof window.miro === 'undefined') {
      throw new Error('Miro SDK not available. This must be run inside Miro.');
    }

    const miro = window.miro;

    // Layout constants
    const DIAGRAM = {
      START_X: 1500,
      START_Y: 0,
      BOX_WIDTH: 160,
      BOX_HEIGHT: 50,
      SMALL_BOX_WIDTH: 130,
      SMALL_BOX_HEIGHT: 36,
      FLOW_BOX_WIDTH: 140,
      FLOW_BOX_HEIGHT: 60,
      GAP_X: 40,
      GAP_Y: 25,
      ARROW_SIZE: 30,
    };

    // Colors
    const COLORS = {
      admin: 'var(--color-error)',       // Red - Admin actions
      client: 'var(--color-accent-light)',      // Blue - Client actions
      designer: 'var(--color-purple-500)',    // Purple - Designer actions
      system: 'var(--color-gray-500)',      // Gray - System processes
      supabase: 'var(--color-success)',    // Green - Database
      miro: 'var(--color-warning)',        // Amber - Miro
      success: 'var(--color-success)',     // Emerald - Success states
      flow: 'var(--color-accent)',        // Sky - Flow arrows
    };

    const startX = DIAGRAM.START_X;
    let currentY = DIAGRAM.START_Y;

    // ============================================
    // SECTION 1: COMPLETE USER JOURNEY FLOW
    // ============================================

    // Main Title
    await miro.board.createText({
      content: '<b>🗺️ COMPLETE SYSTEM FLOW</b>',
      x: startX + 400,
      y: currentY,
      width: 800,
      style: { fontSize: 32, textAlign: 'center', color: 'var(--color-primary)' },
    });

    await miro.board.createText({
      content: '<i>Brianna Dawes Studios - From Client Creation to Report Generation</i>',
      x: startX + 400,
      y: currentY + 45,
      width: 800,
      style: { fontSize: 14, textAlign: 'center', color: 'var(--color-gray-500)' },
    });

    currentY += 120;

    // ============ STEP 1: CLIENT SETUP ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>1️⃣ CLIENT SETUP (Admin)</b>',
      style: { fillColor: COLORS.admin, color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    // Client setup flow boxes
    const clientSetupSteps = [
      { label: 'Create Client', desc: 'Admin Settings\n→ Users', icon: '👤' },
      { label: 'Assign Plan', desc: 'Subscription\nPlan + Limits', icon: '💳' },
      { label: 'Create Board', desc: 'New Miro Board\nfor Client', icon: '📋' },
      { label: 'Link Board', desc: 'primary_board_id\nin users table', icon: '🔗' },
      { label: 'Send Invite', desc: 'Email with\nLogin Link', icon: '✉️' },
    ];

    for (let i = 0; i < clientSetupSteps.length; i++) {
      const step = clientSetupSteps[i];
      if (!step) continue;
      const x = startX + 80 + i * (DIAGRAM.FLOW_BOX_WIDTH + 50);

      await miro.board.createShape({
        shape: 'round_rectangle',
        x: x,
        y: currentY,
        width: DIAGRAM.FLOW_BOX_WIDTH,
        height: DIAGRAM.FLOW_BOX_HEIGHT + 10,
        content: `${step.icon}\n<b>${step.label}</b>\n${step.desc}`,
        style: { fillColor: 'var(--color-error-light)', borderColor: COLORS.admin, fontSize: 9, textAlign: 'center', textAlignVertical: 'middle' },
      });

      // Arrow between boxes
      if (i < clientSetupSteps.length - 1) {
        await miro.board.createText({
          content: '→',
          x: x + DIAGRAM.FLOW_BOX_WIDTH / 2 + 35,
          y: currentY,
          width: 40,
          style: { fontSize: 24, textAlign: 'center', color: COLORS.flow },
        });
      }
    }

    // Data flow indicator
    await miro.board.createText({
      content: '💾 Supabase: users table (role=client, plan_id, primary_board_id)',
      x: startX + 400,
      y: currentY + 55,
      width: 500,
      style: { fontSize: 10, textAlign: 'center', color: COLORS.supabase },
    });

    currentY += 130;

    // ============ STEP 2: PROJECT CREATION ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>2️⃣ PROJECT CREATION (Admin/Client)</b>',
      style: { fillColor: COLORS.client, color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    const projectSteps = [
      { label: 'New Project', desc: 'Dashboard\n→ New Project', icon: '➕' },
      { label: 'Fill Brief', desc: 'Name, Type,\nDeadline, Details', icon: '📝' },
      { label: 'Add Files', desc: 'References\nGoogle Drive', icon: '📁' },
      { label: 'Save to DB', desc: 'projects table\nstatus: draft', icon: '💾' },
      { label: 'Sync to Miro', desc: 'Timeline Card +\nBriefing Frame', icon: '🎨' },
    ];

    for (let i = 0; i < projectSteps.length; i++) {
      const step = projectSteps[i];
      if (!step) continue;
      const x = startX + 80 + i * (DIAGRAM.FLOW_BOX_WIDTH + 50);

      await miro.board.createShape({
        shape: 'round_rectangle',
        x: x,
        y: currentY,
        width: DIAGRAM.FLOW_BOX_WIDTH,
        height: DIAGRAM.FLOW_BOX_HEIGHT + 10,
        content: `${step.icon}\n<b>${step.label}</b>\n${step.desc}`,
        style: { fillColor: 'var(--color-info-light)', borderColor: COLORS.client, fontSize: 9, textAlign: 'center', textAlignVertical: 'middle' },
      });

      if (i < projectSteps.length - 1) {
        await miro.board.createText({
          content: '→',
          x: x + DIAGRAM.FLOW_BOX_WIDTH / 2 + 35,
          y: currentY,
          width: 40,
          style: { fontSize: 24, textAlign: 'center', color: COLORS.flow },
        });
      }
    }

    await miro.board.createText({
      content: '💾 Supabase: projects table (client_id, miro_board_id, status, briefing JSONB)',
      x: startX + 400,
      y: currentY + 55,
      width: 550,
      style: { fontSize: 10, textAlign: 'center', color: COLORS.supabase },
    });

    currentY += 130;

    // ============ STEP 3: WORK & DELIVERABLES ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>3️⃣ WORK & DELIVERABLES (Designer)</b>',
      style: { fillColor: COLORS.designer, color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    const workSteps = [
      { label: 'Assign Designer', desc: 'Admin assigns\ndesigner_ids[]', icon: '👩‍🎨' },
      { label: 'Start Work', desc: 'Status →\nin_progress', icon: '🚀' },
      { label: 'Add Deliverables', desc: 'Create assets\ncount + bonus', icon: '📦' },
      { label: 'Upload Files', desc: 'Supabase Storage\nfile references', icon: '☁️' },
      { label: 'Update Miro', desc: 'Add versions\nto project frame', icon: '🔄' },
    ];

    for (let i = 0; i < workSteps.length; i++) {
      const step = workSteps[i];
      if (!step) continue;
      const x = startX + 80 + i * (DIAGRAM.FLOW_BOX_WIDTH + 50);

      await miro.board.createShape({
        shape: 'round_rectangle',
        x: x,
        y: currentY,
        width: DIAGRAM.FLOW_BOX_WIDTH,
        height: DIAGRAM.FLOW_BOX_HEIGHT + 10,
        content: `${step.icon}\n<b>${step.label}</b>\n${step.desc}`,
        style: { fillColor: 'var(--color-purple-500)', borderColor: COLORS.designer, fontSize: 9, textAlign: 'center', textAlignVertical: 'middle' },
      });

      if (i < workSteps.length - 1) {
        await miro.board.createText({
          content: '→',
          x: x + DIAGRAM.FLOW_BOX_WIDTH / 2 + 35,
          y: currentY,
          width: 40,
          style: { fontSize: 24, textAlign: 'center', color: COLORS.flow },
        });
      }
    }

    await miro.board.createText({
      content: '💾 Supabase: deliverables table (project_id, count, bonus_count, status) + files table',
      x: startX + 400,
      y: currentY + 55,
      width: 600,
      style: { fontSize: 10, textAlign: 'center', color: COLORS.supabase },
    });

    currentY += 130;

    // ============ STEP 4: REVIEW CYCLE ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>4️⃣ REVIEW CYCLE (Client ↔ Designer)</b>',
      style: { fillColor: 'var(--color-warning)', color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    const reviewSteps = [
      { label: 'Send to Review', desc: 'Designer sets\nstatus: review', icon: '📤' },
      { label: 'Client Reviews', desc: 'View deliverables\nin Miro board', icon: '👁️' },
      { label: 'Request Changes', desc: 'was_reviewed=true\nback to in_progress', icon: '✏️' },
      { label: 'Make Revisions', desc: 'Designer updates\nadd new version', icon: '🔧' },
      { label: 'Approve', desc: 'was_approved=true\nstatus: done', icon: '✅' },
    ];

    for (let i = 0; i < reviewSteps.length; i++) {
      const step = reviewSteps[i];
      if (!step) continue;
      const x = startX + 80 + i * (DIAGRAM.FLOW_BOX_WIDTH + 50);

      await miro.board.createShape({
        shape: 'round_rectangle',
        x: x,
        y: currentY,
        width: DIAGRAM.FLOW_BOX_WIDTH,
        height: DIAGRAM.FLOW_BOX_HEIGHT + 10,
        content: `${step.icon}\n<b>${step.label}</b>\n${step.desc}`,
        style: { fillColor: 'var(--color-warning-light)', borderColor: 'var(--color-warning)', fontSize: 9, textAlign: 'center', textAlignVertical: 'middle' },
      });

      if (i < reviewSteps.length - 1) {
        await miro.board.createText({
          content: '→',
          x: x + DIAGRAM.FLOW_BOX_WIDTH / 2 + 35,
          y: currentY,
          width: 40,
          style: { fontSize: 24, textAlign: 'center', color: COLORS.flow },
        });
      }
    }

    // Review loop indicator
    await miro.board.createText({
      content: '🔄 Loop: Steps 3-4 repeat until client approves (was_approved=true)',
      x: startX + 400,
      y: currentY + 55,
      width: 500,
      style: { fontSize: 10, textAlign: 'center', color: 'var(--color-warning)' },
    });

    currentY += 130;

    // ============ STEP 5: COMPLETION & REPORTS ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>5️⃣ COMPLETION & REPORTS (Admin)</b>',
      style: { fillColor: COLORS.success, color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    const reportSteps = [
      { label: 'Project Done', desc: 'status: done\nMiro: green card', icon: '🎉' },
      { label: 'Analytics', desc: 'Dashboard stats\nactive/completed', icon: '📊' },
      { label: 'Client Report', desc: 'Per-client metrics\ndeliverables used', icon: '📈' },
      { label: 'Generate PDF', desc: 'Experience\nFeedback Form', icon: '📄' },
      { label: 'Master Board', desc: 'All clients\noverview sync', icon: '🗂️' },
    ];

    for (let i = 0; i < reportSteps.length; i++) {
      const step = reportSteps[i];
      if (!step) continue;
      const x = startX + 80 + i * (DIAGRAM.FLOW_BOX_WIDTH + 50);

      await miro.board.createShape({
        shape: 'round_rectangle',
        x: x,
        y: currentY,
        width: DIAGRAM.FLOW_BOX_WIDTH,
        height: DIAGRAM.FLOW_BOX_HEIGHT + 10,
        content: `${step.icon}\n<b>${step.label}</b>\n${step.desc}`,
        style: { fillColor: 'var(--color-success-light)', borderColor: COLORS.success, fontSize: 9, textAlign: 'center', textAlignVertical: 'middle' },
      });

      if (i < reportSteps.length - 1) {
        await miro.board.createText({
          content: '→',
          x: x + DIAGRAM.FLOW_BOX_WIDTH / 2 + 35,
          y: currentY,
          width: 40,
          style: { fontSize: 24, textAlign: 'center', color: COLORS.flow },
        });
      }
    }

    await miro.board.createText({
      content: '💾 reportService.generateClientReport() → PDF with all metrics',
      x: startX + 400,
      y: currentY + 55,
      width: 500,
      style: { fontSize: 10, textAlign: 'center', color: COLORS.success },
    });

    currentY += 150;

    // ============================================
    // SECTION 2: TECHNICAL ARCHITECTURE
    // ============================================

    await miro.board.createText({
      content: '<b>🏗️ TECHNICAL ARCHITECTURE</b>',
      x: startX + 400,
      y: currentY,
      width: 800,
      style: { fontSize: 28, textAlign: 'center', color: 'var(--color-primary)' },
    });

    currentY += 80;

    // Database Schema
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 200,
      y: currentY,
      width: 350,
      height: 40,
      content: '<b>🗄️ SUPABASE DATABASE</b>',
      style: { fillColor: COLORS.supabase, color: 'var(--color-text-inverse)', fontSize: 14, textAlign: 'center', textAlignVertical: 'middle' },
    });

    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 600,
      y: currentY,
      width: 350,
      height: 40,
      content: '<b>🎨 MIRO BOARD ELEMENTS</b>',
      style: { fillColor: COLORS.miro, color: 'var(--color-text-inverse)', fontSize: 14, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 60;

    // Database tables
    const tables = [
      { name: 'users', fields: 'id, name, email, role,\nplan_id, primary_board_id' },
      { name: 'projects', fields: 'id, name, status, client_id,\nmiro_board_id, briefing' },
      { name: 'deliverables', fields: 'id, project_id, name,\ncount, bonus_count, status' },
      { name: 'files', fields: 'id, project_id, deliverable_id,\nurl, type, size' },
      { name: 'app_settings', fields: 'key, value (JSONB),\nmaster_board_id, etc.' },
      { name: 'subscription_plans', fields: 'id, name, price,\ndeliverables_limit' },
    ];

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      if (!table) continue;
      const col = i % 2;
      const row = Math.floor(i / 2);
      await miro.board.createShape({
        shape: 'rectangle',
        x: startX + 100 + col * 200,
        y: currentY + row * 70,
        width: 180,
        height: 60,
        content: `<b>${table.name}</b>\n${table.fields}`,
        style: { fillColor: 'var(--color-success-light)', borderColor: COLORS.supabase, fontSize: 8, textAlign: 'center', textAlignVertical: 'middle' },
      });
    }

    // Miro elements
    const miroElements = [
      { name: 'Timeline Frame', desc: '7-column Kanban\nstatus tracking' },
      { name: 'Project Card', desc: 'Name, due date,\ncolor by status' },
      { name: 'Briefing Frame', desc: 'Project details,\nstatus badge' },
      { name: 'Version Frames', desc: 'Design iterations\nfor review' },
      { name: 'Master Board', desc: 'All clients\nconsolidated view' },
      { name: 'Arch Diagram', desc: 'This diagram!\nSystem overview' },
    ];

    for (let i = 0; i < miroElements.length; i++) {
      const element = miroElements[i];
      if (!element) continue;
      const col = i % 2;
      const row = Math.floor(i / 2);
      await miro.board.createShape({
        shape: 'rectangle',
        x: startX + 500 + col * 200,
        y: currentY + row * 70,
        width: 180,
        height: 60,
        content: `<b>${element.name}</b>\n${element.desc}`,
        style: { fillColor: 'var(--color-warning-light)', borderColor: COLORS.miro, fontSize: 8, textAlign: 'center', textAlignVertical: 'middle' },
      });
    }

    currentY += 250;

    // ============ USER ROLES PERMISSIONS ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>👥 USER ROLES & PERMISSIONS</b>',
      style: { fillColor: 'var(--color-gray-700)', color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    const roles = [
      {
        name: 'ADMIN',
        color: COLORS.admin,
        perms: '• Manage all users\n• Create/edit all projects\n• Access all boards\n• Generate reports\n• Master Board access'
      },
      {
        name: 'DESIGNER',
        color: COLORS.designer,
        perms: '• View assigned projects\n• Update project status\n• Add deliverables\n• Create versions\n• Can\'t delete projects'
      },
      {
        name: 'CLIENT',
        color: COLORS.client,
        perms: '• View own projects\n• Create new projects\n• Review deliverables\n• Approve/request changes\n• Own board only'
      },
    ];

    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      if (!role) continue;
      await miro.board.createShape({
        shape: 'round_rectangle',
        x: startX + 140 + i * 280,
        y: currentY,
        width: 250,
        height: 120,
        content: `<b>${role.name}</b>\n\n${role.perms}`,
        style: { fillColor: role.color + '20', borderColor: role.color, fontSize: 9, textAlign: 'left', textAlignVertical: 'top' },
      });
    }

    currentY += 160;

    // ============ KEY SERVICES ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 40,
      content: '<b>⚙️ KEY SERVICES & HOOKS</b>',
      style: { fillColor: 'var(--color-info)', color: 'var(--color-text-inverse)', fontSize: 16, textAlign: 'center', textAlignVertical: 'middle' },
    });

    currentY += 70;

    const services = [
      { name: 'projectService', desc: 'CRUD operations\nfor projects table' },
      { name: 'deliverableService', desc: 'Manage deliverables\nand file uploads' },
      { name: 'miroSdkService', desc: 'Timeline sync\nBoard manipulation' },
      { name: 'masterBoardService', desc: 'Client overview\nMulti-board sync' },
      { name: 'reportService', desc: 'Analytics calc\nPDF generation' },
      { name: 'useProjects()', desc: 'React Query hook\nfor project data' },
    ];

    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (!service) continue;
      const col = i % 3;
      const row = Math.floor(i / 3);
      await miro.board.createShape({
        shape: 'rectangle',
        x: startX + 140 + col * 280,
        y: currentY + row * 65,
        width: 250,
        height: 55,
        content: `<b>${service.name}</b>\n${service.desc}`,
        style: { fillColor: 'var(--color-info-light)', borderColor: 'var(--color-info)', fontSize: 9, textAlign: 'center', textAlignVertical: 'middle' },
      });
    }

    currentY += 170;

    // ============ REALTIME & SYNC ============
    await miro.board.createShape({
      shape: 'round_rectangle',
      x: startX + 400,
      y: currentY,
      width: 850,
      height: 150,
      content: '',
      style: { fillColor: 'var(--color-gray-50)', borderColor: 'var(--color-gray-200)', borderWidth: 2 },
    });

    await miro.board.createText({
      content: '<b>🔄 REALTIME SYNC FLOW</b>',
      x: startX + 400,
      y: currentY - 50,
      width: 300,
      style: { fontSize: 14, textAlign: 'center', color: 'var(--color-gray-700)' },
    });

    const syncSteps = [
      '1. User updates project status in React App',
      '2. useUpdateProject() mutation → Supabase projects table',
      '3. Supabase Realtime broadcasts UPDATE event to all subscribed clients',
      '4. useRealtimeSubscription() receives event → triggers refetch()',
      '5. syncProject() called → Miro SDK updates card position/color in Timeline',
      '6. miroProjectRowService.updateBriefingStatus() → Updates briefing frame badge',
    ];

    for (let i = 0; i < syncSteps.length; i++) {
      await miro.board.createText({
        content: syncSteps[i] || '',
        x: startX + 400,
        y: currentY - 30 + i * 22,
        width: 750,
        style: { fontSize: 10, textAlign: 'left', color: 'var(--color-gray-600)' },
      });
    }

    // Zoom to show entire diagram
    await miro.board.viewport.set({
      x: startX - 100,
      y: DIAGRAM.START_Y - 100,
      width: 1000,
      height: 1800,
    });
  }
}

export const masterBoardService = new MasterBoardService();
