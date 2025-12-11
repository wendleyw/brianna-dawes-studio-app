/**
 * Master Board Service
 *
 * Manages a consolidated "Master Board" that displays all clients
 * with their projects organized in vertical frames with mini-kanbans.
 */

import { miroClient } from './miroClient';
import { supabase } from '@shared/lib/supabase';
import type { ClientAnalytics } from '@features/admin/domain/analytics.types';

// Layout constants for the Master Board
const MASTER_BOARD = {
  // Title area
  TITLE_X: 0,
  TITLE_Y: 0,

  // Where client frames start
  CONTENT_START_X: 0,
  CONTENT_START_Y: 150,

  // Client Frame dimensions
  CLIENT_FRAME_WIDTH: 1200,
  CLIENT_FRAME_MIN_HEIGHT: 280,
  CLIENT_FRAME_GAP: 60, // Gap between frames vertically
  CLIENT_FRAME_PADDING: 20,

  // Header inside client frame
  HEADER_HEIGHT: 50,

  // Mini-Kanban columns
  COLUMN_WIDTH: 200,
  COLUMN_GAP: 15,
  COLUMN_HEADER_HEIGHT: 35,
  CARD_WIDTH: 180,
  CARD_HEIGHT: 45,
  CARD_GAP: 10,
};

// Simplified status columns for mini-kanban
const STATUS_COLUMNS = [
  { id: 'in_progress', label: 'IN PROGRESS', color: '#3B82F6' },
  { id: 'review', label: 'REVIEW', color: '#8B5CF6' },
  { id: 'done', label: 'DONE', color: '#22C55E' },
  { id: 'overdue', label: 'OVERDUE', color: '#EF4444' },
] as const;

// Map project status to kanban column
function getColumnForStatus(status: string): string {
  if (['critical', 'overdue'].includes(status)) return 'overdue';
  if (['urgent', 'on_track', 'in_progress'].includes(status)) return 'in_progress';
  if (status === 'review') return 'review';
  if (status === 'done') return 'done';
  return 'in_progress';
}

// Get card color based on status
function getCardTheme(status: string): string {
  switch (status) {
    case 'critical':
    case 'overdue':
      return 'red';
    case 'urgent':
      return 'orange';
    case 'review':
      return 'violet';
    case 'done':
      return 'green';
    default:
      return 'blue';
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
   */
  async initializeMasterBoard(boardId: string): Promise<void> {
    // Create main title
    await miroClient.createText(boardId, {
      content: '<b>MASTER OVERVIEW - BRIANNA DAWES STUDIOS</b>',
      x: MASTER_BOARD.TITLE_X + MASTER_BOARD.CLIENT_FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y,
      width: 800,
      style: {
        fontSize: '36',
        textAlign: 'center',
        color: '#050038',
      },
    });

    // Create warning message
    await miroClient.createText(boardId, {
      content: 'Sync manually from Admin Settings - Do not edit manually',
      x: MASTER_BOARD.TITLE_X + MASTER_BOARD.CLIENT_FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y + 50,
      width: 600,
      style: {
        fontSize: '14',
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
      MASTER_BOARD.CLIENT_FRAME_PADDING * 2 +
      MASTER_BOARD.HEADER_HEIGHT +
      MASTER_BOARD.COLUMN_HEADER_HEIGHT +
      projectsHeight +
      20; // Extra padding

    return Math.max(totalHeight, MASTER_BOARD.CLIENT_FRAME_MIN_HEIGHT);
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
        x: MASTER_BOARD.CONTENT_START_X,
        y: yPosition,
        width: MASTER_BOARD.CLIENT_FRAME_WIDTH,
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
   */
  private async createClientHeader(
    boardId: string,
    client: ClientWithProjects,
    frameY: number
  ): Promise<void> {
    const headerY = frameY + MASTER_BOARD.CLIENT_FRAME_PADDING + MASTER_BOARD.HEADER_HEIGHT / 2;
    const startX = MASTER_BOARD.CONTENT_START_X + MASTER_BOARD.CLIENT_FRAME_PADDING;

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
   */
  private async createMiniKanban(
    boardId: string,
    projects: ProjectInfo[],
    frameY: number
  ): Promise<void> {
    const kanbanStartY =
      frameY + MASTER_BOARD.CLIENT_FRAME_PADDING + MASTER_BOARD.HEADER_HEIGHT + 20;
    const kanbanStartX = MASTER_BOARD.CONTENT_START_X + MASTER_BOARD.CLIENT_FRAME_PADDING + 30;

    // Group projects by column
    const projectsByColumn: Record<string, ProjectInfo[]> = {
      in_progress: [],
      review: [],
      done: [],
      overdue: [],
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

        if (project.dueDate) {
          cardData.dueDate = project.dueDate;
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
      let currentY = MASTER_BOARD.CONTENT_START_Y;

      for (const client of clientsWithProjects) {
        try {
          const { height } = await this.syncClientFrame(boardId, client, currentY);
          currentY += height + MASTER_BOARD.CLIENT_FRAME_GAP;
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
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'master_board_sync_status')
      .single();

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

    // Create main title
    await miro.board.createText({
      content: '<b>MASTER OVERVIEW - BRIANNA DAWES STUDIOS</b>',
      x: MASTER_BOARD.TITLE_X + MASTER_BOARD.CLIENT_FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y,
      width: 800,
      style: {
        fontSize: 36,
        textAlign: 'center',
        color: '#050038',
      },
    });

    // Create warning message
    await miro.board.createText({
      content: 'Sync manually from Admin Settings - Do not edit manually',
      x: MASTER_BOARD.TITLE_X + MASTER_BOARD.CLIENT_FRAME_WIDTH / 2,
      y: MASTER_BOARD.TITLE_Y + 50,
      width: 600,
      style: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666666',
      },
    });
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
      let currentY = MASTER_BOARD.CONTENT_START_Y;

      for (const client of clientsWithProjects) {
        try {
          const frameHeight = this.calculateFrameHeight(client.projects.length);
          const frameTitle = `${client.companyName || client.name} [${client.id}]`;

          // Create frame for client
          const frame = await miro.board.createFrame({
            title: frameTitle,
            x: MASTER_BOARD.CONTENT_START_X,
            y: currentY,
            width: MASTER_BOARD.CLIENT_FRAME_WIDTH,
            height: frameHeight,
            style: {
              fillColor: '#FFFFFF',
            },
          });

          // Create header content
          await this.createClientHeaderWithSdk(miro, client, currentY);

          // Create mini-kanban
          await this.createMiniKanbanWithSdk(miro, client.projects, currentY, frame);

          currentY += frameHeight + MASTER_BOARD.CLIENT_FRAME_GAP;
          clientsProcessed++;
        } catch (error) {
          const errorMsg = `Failed to sync client ${client.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
   * Create client header using SDK
   */
  private async createClientHeaderWithSdk(
    miro: typeof window.miro,
    client: ClientWithProjects,
    frameY: number
  ): Promise<void> {
    const headerY = frameY + MASTER_BOARD.CLIENT_FRAME_PADDING + MASTER_BOARD.HEADER_HEIGHT / 2;
    const startX = MASTER_BOARD.CONTENT_START_X + MASTER_BOARD.CLIENT_FRAME_PADDING;

    // Client name (large, bold)
    const displayName = client.companyName || client.name;
    await miro.board.createText({
      content: `<b>${displayName}</b>`,
      x: startX + 150,
      y: headerY - 10,
      width: 300,
      style: {
        fontSize: 18,
        textAlign: 'left',
        color: '#050038',
      },
    });

    // Stats line
    const statsText = `${client.email}  |  ${client.totalProjects} Projects  |  ${client.activeProjects} Active  |  ${client.totalDeliverables} Deliverables`;
    await miro.board.createText({
      content: statsText,
      x: startX + 350,
      y: headerY + 15,
      width: 600,
      style: {
        fontSize: 12,
        textAlign: 'left',
        color: '#666666',
      },
    });
  }

  /**
   * Create mini-kanban using SDK
   */
  private async createMiniKanbanWithSdk(
    miro: typeof window.miro,
    projects: ProjectInfo[],
    frameY: number,
    _frame: { id: string }
  ): Promise<void> {
    const kanbanStartY =
      frameY + MASTER_BOARD.CLIENT_FRAME_PADDING + MASTER_BOARD.HEADER_HEIGHT + 20;
    const kanbanStartX = MASTER_BOARD.CONTENT_START_X + MASTER_BOARD.CLIENT_FRAME_PADDING + 30;

    // Group projects by column
    const projectsByColumn: Record<string, ProjectInfo[]> = {
      in_progress: [],
      review: [],
      done: [],
      overdue: [],
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

      // Column header (shape)
      await miro.board.createShape({
        shape: 'round_rectangle',
        x: columnX + MASTER_BOARD.COLUMN_WIDTH / 2,
        y: kanbanStartY,
        width: MASTER_BOARD.COLUMN_WIDTH - 10,
        height: MASTER_BOARD.COLUMN_HEADER_HEIGHT,
        content: `${column.label} (${columnProjects.length})`,
        style: {
          fillColor: column.color,
          color: '#FFFFFF',
          fontSize: 12,
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

        // Build card data, only include dueDate if not null
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

        if (project.dueDate) {
          cardData.dueDate = project.dueDate;
        }

        await miro.board.createCard(cardData);
      }
    }
  }
}

export const masterBoardService = new MasterBoardService();
