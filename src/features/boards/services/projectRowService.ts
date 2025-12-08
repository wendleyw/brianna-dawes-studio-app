import { miroClient } from './miroClient';
import type { ProjectBriefing, ProjectRowState } from '../domain/board.types';
import type { Project } from '@features/projects/domain/project.types';

// Layout constants
const PROJECT_ROWS_START_X = 100;
const PROJECT_ROWS_START_Y = 1000; // Below the Master Timeline
const BRIEFING_FRAME_WIDTH = 700;
const BRIEFING_FRAME_HEIGHT = 900;
const PROCESS_FRAME_WIDTH = 700;
const PROCESS_FRAME_HEIGHT = 900;
const FRAME_GAP = 50;
const ROW_GAP = 100;

// Briefing field configuration (3-column grid)
const BRIEFING_FIELDS: Array<{ key: keyof ProjectBriefing; label: string; column: 0 | 1 | 2; row: number }> = [
  // Column 1
  { key: 'projectOverview', label: 'Project Overview / Description', column: 0, row: 0 },
  { key: 'targetAudience', label: 'Target Audience', column: 0, row: 1 },
  { key: 'goals', label: 'Goals / Objectives', column: 0, row: 2 },
  { key: 'resourceLinks', label: 'Resource Links / Assets', column: 0, row: 3 },
  // Column 2
  { key: 'finalMessaging', label: 'Final Messaging / Copy', column: 1, row: 0 },
  { key: 'deliverables', label: 'Deliverables', column: 1, row: 1 },
  { key: 'timeline', label: 'Timeline / Key Milestones', column: 1, row: 2 },
  { key: 'additionalNotes', label: 'Additional Notes / Special Requirements', column: 1, row: 3 },
  // Column 3
  { key: 'inspirations', label: 'Inspirations / References', column: 2, row: 0 },
  { key: 'styleNotes', label: 'Style / Design Notes', column: 2, row: 1 },
];

// Grid cell dimensions
const CELL_WIDTH = 200;
const CELL_HEIGHT = 150;
const CELL_GAP = 15;
const GRID_START_Y = 120;

// Process stages
const DEFAULT_STAGES = ['STAGE 1', 'STAGE 2', 'STAGE 3'];

class ProjectRowService {
  private projectRows: Map<string, ProjectRowState> = new Map();
  private boardId: string | null = null;
  private nextRowY: number = PROJECT_ROWS_START_Y;

  /**
   * Initialize the service with a board ID
   */
  setBoardId(boardId: string): void {
    this.boardId = boardId;
  }

  /**
   * Create a project row with briefing and process frames
   */
  async createProjectRow(
    project: Project,
    briefing: ProjectBriefing
  ): Promise<ProjectRowState> {
    if (!this.boardId) {
      throw new Error('Board ID not set. Call setBoardId first.');
    }

    const projectCode = `BDS-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const rowY = this.nextRowY;

    // Create Briefing Frame
    const briefingFrame = await miroClient.createFrame(this.boardId, {
      title: `⭐ ${project.client?.name || 'Client'} - ${project.name} - BRIEFING - BRIANNA DAWES STUDIOS [${projectCode}]`,
      x: PROJECT_ROWS_START_X,
      y: rowY,
      width: BRIEFING_FRAME_WIDTH,
      height: BRIEFING_FRAME_HEIGHT,
      fillColor: '#FFFFFF',
    });

    // Create Process Stages Frame
    const processFrame = await miroClient.createFrame(this.boardId, {
      title: `⭐ ${project.client?.name || 'Client'} - ${project.name} - PROCESS STAGES - BRIANNA DAWES STUDIOS [${projectCode}]`,
      x: PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH + FRAME_GAP,
      y: rowY,
      width: PROCESS_FRAME_WIDTH,
      height: PROCESS_FRAME_HEIGHT,
      fillColor: '#FFFFFF',
    });

    // Create briefing header with status badge and info
    await this.createBriefingHeader(
      briefingFrame.id,
      project,
      rowY
    );

    // Create briefing grid
    const briefingItems = await this.createBriefingGrid(
      briefingFrame.id,
      briefing,
      rowY
    );

    // Create creative direction section
    await this.createCreativeDirectionSection(
      briefingFrame.id,
      rowY
    );

    // Create process stages section
    const processStages = await this.createProcessStages(
      processFrame.id,
      rowY
    );

    const projectRow: ProjectRowState = {
      projectId: project.id,
      projectName: project.name,
      clientName: project.client?.name || 'Client',
      briefingFrameId: briefingFrame.id,
      processFrameId: processFrame.id,
      y: rowY,
      briefingItems,
      processStages,
    };

    this.projectRows.set(project.id, projectRow);
    this.nextRowY = rowY + Math.max(BRIEFING_FRAME_HEIGHT, PROCESS_FRAME_HEIGHT) + ROW_GAP;

    return projectRow;
  }

  /**
   * Create the briefing header with status and project info
   */
  private async createBriefingHeader(
    _frameId: string,
    project: Project,
    rowY: number
  ): Promise<void> {
    if (!this.boardId) return;

    const headerY = rowY + 40;
    const headerX = PROJECT_ROWS_START_X + 20;

    // Status badge (URGENT in red if urgent)
    if (project.priority === 'urgent') {
      await miroClient.createShape(this.boardId, {
        shape: 'round_rectangle',
        x: headerX + 40,
        y: headerY,
        width: 70,
        height: 25,
        content: 'URGENT',
        style: {
          fillColor: '#DC2626',
          fontColor: '#FFFFFF',
          fontSize: '10',
        },
      });
    }

    // Header bar (golden/yellow)
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH / 2,
      y: headerY + 25,
      width: BRIEFING_FRAME_WIDTH - 40,
      height: 30,
      content: `⭐ Brianna D Studio`,
      style: {
        fillColor: '#D4A574',
        fontColor: '#FFFFFF',
        fontSize: '11',
      },
    });

    // Project info line
    const dueDate = project.dueDate
      ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'No deadline';

    await miroClient.createText(this.boardId, {
      content: `📌 PROJECT NAME - Starting Date: ${project.startDate ? new Date(project.startDate).toLocaleDateString() : 'TBD'} | Due Date: ${dueDate}`,
      x: PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH / 2,
      y: headerY + 60,
      width: BRIEFING_FRAME_WIDTH - 40,
      style: {
        fontSize: '10',
        color: '#374151',
      },
    });
  }

  /**
   * Create the briefing grid with 3 columns
   */
  private async createBriefingGrid(
    _frameId: string,
    briefing: ProjectBriefing,
    rowY: number
  ): Promise<Array<{ id: string; miroItemId: string | null; fieldKey: string }>> {
    if (!this.boardId) return [];

    const items: Array<{ id: string; miroItemId: string | null; fieldKey: string }> = [];
    const gridStartY = rowY + GRID_START_Y;
    const gridStartX = PROJECT_ROWS_START_X + 30;

    for (const field of BRIEFING_FIELDS) {
      const cellX = gridStartX + field.column * (CELL_WIDTH + CELL_GAP) + CELL_WIDTH / 2;
      const cellY = gridStartY + field.row * (CELL_HEIGHT + CELL_GAP);

      // Field label
      await miroClient.createText(this.boardId, {
        content: field.label,
        x: cellX,
        y: cellY,
        width: CELL_WIDTH,
        style: {
          fontSize: '10',
          color: '#111827',
        },
      });

      // Field value or empty placeholder
      const value = briefing[field.key];
      const displayValue = value || '(Not provided)';
      const isEmpty = !value;

      const valueItem = await miroClient.createShape(this.boardId, {
        shape: 'rectangle',
        x: cellX,
        y: cellY + 60,
        width: CELL_WIDTH,
        height: CELL_HEIGHT - 30,
        content: displayValue,
        style: {
          fillColor: isEmpty ? '#FEF3C7' : '#FFFFFF',
          borderColor: isEmpty ? '#F59E0B' : '#E5E7EB',
          fontColor: isEmpty ? '#92400E' : '#374151',
          fontSize: '9',
        },
      });

      items.push({
        id: crypto.randomUUID(),
        miroItemId: valueItem.id,
        fieldKey: field.key,
      });
    }

    return items;
  }

  /**
   * Create the Creative Direction & Visual Preferences section
   */
  private async createCreativeDirectionSection(
    _frameId: string,
    rowY: number
  ): Promise<void> {
    if (!this.boardId) return;

    const sectionY = rowY + GRID_START_Y + 4 * (CELL_HEIGHT + CELL_GAP) + 30;
    const sectionX = PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH / 2;

    // Section header
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: sectionX,
      y: sectionY,
      width: BRIEFING_FRAME_WIDTH - 40,
      height: 30,
      content: '🎨 CREATIVE DIRECTION & VISUAL PREFERENCES',
      style: {
        fillColor: '#FEF3C7',
        fontColor: '#92400E',
        fontSize: '11',
      },
    });

    // Drop zone area
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: sectionX,
      y: sectionY + 150,
      width: BRIEFING_FRAME_WIDTH - 60,
      height: 200,
      content: 'Drop images, mood boards, style references, and creative here 👆\nThis area is for visual inspiration and creative direction',
      style: {
        fillColor: '#FFFBEB',
        borderColor: '#FCD34D',
        fontColor: '#92400E',
        fontSize: '10',
      },
    });
  }

  /**
   * Create the Process Stages section
   */
  private async createProcessStages(
    _frameId: string,
    rowY: number
  ): Promise<Array<{ id: string; miroItemId: string | null; stageName: string }>> {
    if (!this.boardId) return [];

    const stages: Array<{ id: string; miroItemId: string | null; stageName: string }> = [];
    const stageStartY = rowY + 60;
    const stageX = PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH + FRAME_GAP + PROCESS_FRAME_WIDTH / 2;

    // Process Stages header
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: stageX,
      y: stageStartY,
      width: PROCESS_FRAME_WIDTH - 40,
      height: 35,
      content: '📋 PROCESS STAGES - Click + to add more frames',
      style: {
        fillColor: '#000000',
        fontColor: '#FFFFFF',
        fontSize: '12',
      },
    });

    // Create stage sections
    let currentY = stageStartY + 60;
    for (const stageName of DEFAULT_STAGES) {
      // Stage header
      const stageHeader = await miroClient.createShape(this.boardId, {
        shape: 'rectangle',
        x: stageX,
        y: currentY,
        width: PROCESS_FRAME_WIDTH - 40,
        height: 30,
        content: `🎯 ${stageName}`,
        style: {
          fillColor: '#374151',
          fontColor: '#FFFFFF',
          fontSize: '11',
        },
      });

      // Stage content area
      await miroClient.createShape(this.boardId, {
        shape: 'rectangle',
        x: stageX,
        y: currentY + 110,
        width: PROCESS_FRAME_WIDTH - 60,
        height: 150,
        content: `Add deliverables, mockups, and iterations for ${stageName}`,
        style: {
          fillColor: '#F9FAFB',
          borderColor: '#E5E7EB',
          fontColor: '#9CA3AF',
          fontSize: '10',
        },
      });

      stages.push({
        id: crypto.randomUUID(),
        miroItemId: stageHeader.id,
        stageName,
      });

      currentY += 220;
    }

    // Footer note
    await miroClient.createText(this.boardId, {
      content: 'Drag deliverables here. Add attachments here. Images + attachments',
      x: stageX,
      y: rowY + PROCESS_FRAME_HEIGHT - 50,
      width: PROCESS_FRAME_WIDTH - 40,
      style: {
        fontSize: '9',
        color: '#9CA3AF',
        textAlign: 'center',
      },
    });

    return stages;
  }

  /**
   * Update a briefing field value
   */
  async updateBriefingField(
    projectId: string,
    fieldKey: keyof ProjectBriefing,
    value: string | null
  ): Promise<void> {
    if (!this.boardId) return;

    const projectRow = this.projectRows.get(projectId);
    if (!projectRow) {
      throw new Error('Project row not found');
    }

    const item = projectRow.briefingItems.find(i => i.fieldKey === fieldKey);
    if (!item?.miroItemId) return;

    const isEmpty = !value;
    const displayValue = value || '(Not provided)';

    await miroClient.updateShape(this.boardId, item.miroItemId, {
      content: displayValue,
      style: {
        fillColor: isEmpty ? '#FEF3C7' : '#FFFFFF',
        borderColor: isEmpty ? '#F59E0B' : '#E5E7EB',
      },
    });
  }

  /**
   * Get project row state
   */
  getProjectRow(projectId: string): ProjectRowState | undefined {
    return this.projectRows.get(projectId);
  }

  /**
   * Remove a project row
   */
  async removeProjectRow(projectId: string): Promise<void> {
    if (!this.boardId) return;

    const projectRow = this.projectRows.get(projectId);
    if (!projectRow) return;

    // Delete frames (this should cascade delete items inside)
    if (projectRow.briefingFrameId) {
      await miroClient.deleteFrame(this.boardId, projectRow.briefingFrameId);
    }
    if (projectRow.processFrameId) {
      await miroClient.deleteFrame(this.boardId, projectRow.processFrameId);
    }

    this.projectRows.delete(projectId);
  }

  /**
   * Get all project rows
   */
  getAllProjectRows(): ProjectRowState[] {
    return Array.from(this.projectRows.values());
  }
}

export const projectRowService = new ProjectRowService();
