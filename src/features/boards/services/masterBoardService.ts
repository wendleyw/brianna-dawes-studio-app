/**
 * Master Board Service
 *
 * Manages a consolidated "Master Board" that displays all clients
 * with their projects organized in vertical frames with mini-kanbans.
 */

import { miroClient } from './miroClient';
import { supabase } from '@shared/lib/supabase';
import type { ClientAnalytics } from '@features/admin/domain/analytics.types';

// Layout constants for the Master Board - matching main timeline style
const MASTER_BOARD = {
  // Title area (above frame)
  TITLE_Y: -50,

  // Frame dimensions (similar to main timeline)
  FRAME_WIDTH: 900,
  FRAME_HEIGHT: 500,
  FRAME_GAP: 80, // Gap between client frames vertically

  // Internal layout
  PADDING: 20,
  HEADER_HEIGHT: 60, // Client info header

  // Kanban columns (matching main timeline style)
  COLUMN_WIDTH: 160,
  COLUMN_GAP: 10,
  COLUMN_HEADER_HEIGHT: 32,
  COLUMN_HEIGHT: 350,

  // Cards
  CARD_WIDTH: 150,
  CARD_HEIGHT: 36,
  CARD_GAP: 10,
};

// Status columns matching main timeline (5 columns)
const STATUS_COLUMNS = [
  { id: 'overdue', label: 'OVERDUE', color: '#F97316' },
  { id: 'urgent', label: 'URGENT', color: '#DC2626' },
  { id: 'in_progress', label: 'IN PROGRESS', color: '#3B82F6' },
  { id: 'review', label: 'REVIEW', color: '#6366F1' },
  { id: 'done', label: 'DONE', color: '#22C55E' },
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
      return '#F97316'; // Orange - OVERDUE
    case 'urgent':
      return '#DC2626'; // Red - URGENT
    case 'in_progress':
    case 'on_track':
    case 'draft':
      return '#3B82F6'; // Blue - IN PROGRESS
    case 'review':
      return '#6366F1'; // Indigo - REVIEW
    case 'done':
    case 'archived':
      return '#22C55E'; // Green - DONE
    default:
      return '#3B82F6'; // Blue - default
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
        color: '#050038',
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
        color: '#666666',
      },
    });
  }

  /**
   * Get all clients with their projects
   */
  private async getClientsWithProjects(): Promise<ClientWithProjects[]> {
    // Get all clients
    const { data: clients } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (!clients || clients.length === 0) return [];

    // Get all projects grouped by client
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, status, due_date, client_id');

    // Get deliverable counts per project
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('project_id, status');

    // Build client analytics with projects
    return clients.map((client) => {
      const clientProjects = projects?.filter((p) => p.client_id === client.id) || [];
      const projectIds = clientProjects.map((p) => p.id);
      const clientDeliverables = deliverables?.filter((d) => projectIds.includes(d.project_id)) || [];

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
        projects: clientProjects.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          dueDate: p.due_date,
        })),
      };
    });
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
        fillColor: '#FFFFFF',
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
        color: '#050038',
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
        color: '#666666',
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
          fontColor: '#FFFFFF',
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
    if (typeof window.miro === 'undefined') {
      throw new Error('Miro SDK not available. This must be run inside Miro.');
    }

    const miro = window.miro;

    // Create main title (above frames)
    await miro.board.createText({
      content: '<b>MASTER OVERVIEW</b>',
      x: MASTER_BOARD.FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y - 30,
      width: 400,
      style: {
        fontSize: 24,
        textAlign: 'center',
        color: '#050038',
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
        color: '#6B7280',
      },
    });
  }

  /**
   * Clear all existing content from the Master Board (SDK version)
   * Removes all frames, shapes, cards, and texts except the title
   */
  private async clearMasterBoardContentWithSdk(miro: typeof window.miro): Promise<void> {
    try {
      // Get all items on the board
      const [frames, shapes, cards, texts] = await Promise.all([
        miro.board.get({ type: 'frame' }),
        miro.board.get({ type: 'shape' }),
        miro.board.get({ type: 'card' }),
        miro.board.get({ type: 'text' }),
      ]);

      // Remove all frames (this will remove content inside them too)
      for (const frame of frames) {
        try {
          await miro.board.remove(frame);
        } catch {
          // Ignore errors
        }
      }

      // Remove remaining shapes
      for (const shape of shapes) {
        try {
          await miro.board.remove(shape);
        } catch {
          // Ignore errors
        }
      }

      // Remove remaining cards
      for (const card of cards) {
        try {
          await miro.board.remove(card);
        } catch {
          // Ignore errors
        }
      }

      // Remove remaining texts
      for (const text of texts) {
        try {
          await miro.board.remove(text);
        } catch {
          // Ignore errors
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }

  /**
   * Sync all clients using Miro SDK
   * Must be called from within the Master Board context
   */
  async syncAllClientsWithSdk(_boardId: string): Promise<MasterBoardSyncResult> {
    if (typeof window.miro === 'undefined') {
      throw new Error('Miro SDK not available. This must be run inside Miro.');
    }

    const miro = window.miro;
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
          color: '#050038',
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
          color: '#6B7280',
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
              color: '#050038',
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
              color: '#6B7280',
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
              fillColor: '#FFFFFF',
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
          color: '#FFFFFF',
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
          fillColor: '#FFFFFF',
          borderColor: '#E5E7EB',
          borderWidth: 1,
        },
      });

      // Project cards in this column
      const cardsStartY = headerY + MASTER_BOARD.COLUMN_HEADER_HEIGHT / 2 + 20 + MASTER_BOARD.CARD_HEIGHT / 2;

      for (let j = 0; j < columnProjects.length; j++) {
        const project = columnProjects[j];
        if (!project) continue;

        const cardY = cardsStartY + j * (MASTER_BOARD.CARD_HEIGHT + MASTER_BOARD.CARD_GAP);

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
          title: project.name,
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
}

export const masterBoardService = new MasterBoardService();
