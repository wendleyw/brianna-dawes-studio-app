import { miroClient } from './miroClient';
import type { ProjectBriefing, ProjectRowState } from '../domain/board.types';
import type { Project } from '@features/projects/domain/project.types';

// Layout constants
const PROJECT_ROWS_START_X = 100;
const PROJECT_ROWS_START_Y = 1000; // Below the Master Timeline
const BRIEFING_FRAME_WIDTH = 700;
const BRIEFING_FRAME_HEIGHT = 1200; // Increased to fit FILE ASSETS section
const PROCESS_FRAME_WIDTH = 700;
const PROCESS_FRAME_HEIGHT = 1200; // Match briefing frame height
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

// Process versions
const DEFAULT_VERSIONS = ['VERSION 1', 'VERSION 2', 'VERSION 3'];

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

    // Create Process Versions Frame
    const processFrame = await miroClient.createFrame(this.boardId, {
      title: `⭐ ${project.client?.name || 'Client'} - ${project.name} - PROCESS VERSIONS - BRIANNA DAWES STUDIOS [${projectCode}]`,
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

    // Create process versions section
    const processVersions = await this.createProcessVersions(
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
      processVersions,
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
          fillColor: '#EF4444',
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
        fillColor: '#D4AF37',
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
          color: 'var(--color-gray-900)',
        },
      });

      // Field value or empty placeholder
      const value = briefing[field.key];
      const displayValue = value || '⚠️ Needs attention';
      const isEmpty = !value;

      const valueItem = await miroClient.createShape(this.boardId, {
        shape: 'rectangle',
        x: cellX,
        y: cellY + 25,
        width: CELL_WIDTH,
        height: CELL_HEIGHT - 30,
        content: displayValue,
        style: {
          fillColor: isEmpty ? 'var(--color-warning-light)' : '#FFFFFF',
          borderColor: isEmpty ? '#F59E0B' : '#E5E7EB',
          fontColor: isEmpty ? 'var(--color-warning-dark)' : '#374151',
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
      content: 'CREATIVE DIRECTION',
      style: {
        fillColor: '#E5E7EB',
        fontColor: '#374151',
        fontSize: '11',
      },
    });

    // Drop zone area for creative direction
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: sectionX,
      y: sectionY + 130,
      width: BRIEFING_FRAME_WIDTH - 60,
      height: 180,
      content: 'Drop images, mood boards, style references here',
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        fontColor: '#9CA3AF',
        fontSize: '10',
      },
    });

    // FILE ASSETS section
    await this.createFileAssetsSection(sectionY + 280);
  }

  /**
   * Create the FILE ASSETS section
   */
  private async createFileAssetsSection(sectionY: number): Promise<void> {
    if (!this.boardId) return;

    const sectionX = PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH / 2;

    // Section header
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: sectionX,
      y: sectionY,
      width: BRIEFING_FRAME_WIDTH - 40,
      height: 30,
      content: 'FILE ASSETS',
      style: {
        fillColor: '#E5E7EB',
        fontColor: '#374151',
        fontSize: '11',
      },
    });

    // Drop zone area for file assets
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: sectionX,
      y: sectionY + 130,
      width: BRIEFING_FRAME_WIDTH - 60,
      height: 180,
      content: 'Drop product images, kits, logos, and other assets here',
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        fontColor: '#9CA3AF',
        fontSize: '10',
      },
    });
  }

  /**
   * Create the Process Versions section
   */
  private async createProcessVersions(
    _frameId: string,
    rowY: number
  ): Promise<Array<{ id: string; miroItemId: string | null; versionName: string }>> {
    if (!this.boardId) return [];

    const versions: Array<{ id: string; miroItemId: string | null; versionName: string }> = [];
    const versionStartY = rowY + 60;
    const versionX = PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH + FRAME_GAP + PROCESS_FRAME_WIDTH / 2;

    // Process Versions header
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: versionX,
      y: versionStartY,
      width: PROCESS_FRAME_WIDTH - 40,
      height: 35,
      content: '📋 PROCESS VERSIONS - Click + to add more frames',
      style: {
        fillColor: '#000000',
        fontColor: '#FFFFFF',
        fontSize: '12',
      },
    });

    // Create version sections
    let currentY = versionStartY + 60;
    for (const versionName of DEFAULT_VERSIONS) {
      // Version header
      const versionHeader = await miroClient.createShape(this.boardId, {
        shape: 'rectangle',
        x: versionX,
        y: currentY,
        width: PROCESS_FRAME_WIDTH - 40,
        height: 30,
        content: `🎯 ${versionName}`,
        style: {
          fillColor: '#374151',
          fontColor: '#FFFFFF',
          fontSize: '11',
        },
      });

      // Version content area
      await miroClient.createShape(this.boardId, {
        shape: 'rectangle',
        x: versionX,
        y: currentY + 110,
        width: PROCESS_FRAME_WIDTH - 60,
        height: 150,
        content: `Add deliverables, mockups, and iterations for ${versionName}`,
        style: {
          fillColor: '#F9FAFB',
          borderColor: '#E5E7EB',
          fontColor: '#9CA3AF',
          fontSize: '10',
        },
      });

      versions.push({
        id: crypto.randomUUID(),
        miroItemId: versionHeader.id,
        versionName,
      });

      currentY += 220;
    }

    // Create "How Was Your Experience?" section
    await this.createExperienceFeedbackSection(rowY + PROCESS_FRAME_HEIGHT - 180);

    return versions;
  }

  /**
   * Create the "How Was Your Experience?" feedback section
   */
  private async createExperienceFeedbackSection(sectionY: number): Promise<void> {
    if (!this.boardId) return;

    const sectionX = PROJECT_ROWS_START_X + BRIEFING_FRAME_WIDTH + FRAME_GAP + PROCESS_FRAME_WIDTH / 2;
    const sectionWidth = PROCESS_FRAME_WIDTH - 40;

    // Dark header bar
    await miroClient.createShape(this.boardId, {
      shape: 'rectangle',
      x: sectionX,
      y: sectionY,
      width: sectionWidth,
      height: 35,
      content: '',
      style: {
        fillColor: '#374151',
        borderColor: 'transparent',
        borderWidth: 0,
      },
    });

    // Left side - Circle for drag and drop feedback
    const circleX = sectionX - sectionWidth / 2 + 60;
    await miroClient.createShape(this.boardId, {
      shape: 'circle',
      x: circleX,
      y: sectionY + 70,
      width: 70,
      height: 70,
      content: '',
      style: {
        fillColor: '#FFFFFF',
        borderColor: '#9CA3AF',
        borderWidth: 2,
      },
    });

    // Label for circle
    await miroClient.createText(this.boardId, {
      content: 'Drag Circle over for your feedback',
      x: circleX,
      y: sectionY + 120,
      width: 100,
      style: {
        fontSize: '8',
        color: '#6B7280',
        textAlign: 'center',
      },
    });

    // Center - Title and subtitle
    await miroClient.createText(this.boardId, {
      content: '<b>HOW WAS YOUR EXPERIENCE?</b>',
      x: sectionX,
      y: sectionY + 45,
      width: 300,
      style: {
        fontSize: '14',
        color: 'var(--color-gray-900)',
        textAlign: 'center',
      },
    });

    await miroClient.createText(this.boardId, {
      content: 'Select a face to share your feedback',
      x: sectionX,
      y: sectionY + 65,
      width: 300,
      style: {
        fontSize: '10',
        color: '#6B7280',
        textAlign: 'center',
      },
    });

    // Emoji faces - 5 options centered
    const emojis = [
      { emoji: '😢', label: 'Very Unhappy', color: '#EF4444' },
      { emoji: '😟', label: 'Unhappy', color: '#F59E0B' },
      { emoji: '😐', label: 'Neutral', color: '#F59E0B' },
      { emoji: '🙂', label: 'Happy', color: '#10B981' },
      { emoji: '😄', label: 'Very Happy', color: '#10B981' },
    ];

    const emojiStartX = sectionX - 120;
    const emojiY = sectionY + 95;
    const emojiGap = 60;

    for (let i = 0; i < emojis.length; i++) {
      const emojiData = emojis[i];
      if (!emojiData) continue;
      const emojiX = emojiStartX + i * emojiGap;

      // Emoji circle background
      await miroClient.createShape(this.boardId, {
        shape: 'circle',
        x: emojiX,
        y: emojiY,
        width: 40,
        height: 40,
        content: emojiData.emoji,
        style: {
          fillColor: emojiData.color,
          borderColor: 'transparent',
          borderWidth: 0,
          fontSize: '18',
        },
      });

      // Emoji label
      await miroClient.createText(this.boardId, {
        content: emojiData.label,
        x: emojiX,
        y: emojiY + 35,
        width: 60,
        style: {
          fontSize: '7',
          color: emojiData.color,
          textAlign: 'center',
        },
      });
    }

    // Right side - Feedback text area
    const feedbackX = sectionX + sectionWidth / 2 - 80;
    await miroClient.createText(this.boardId, {
      content: 'Add specific notes of feedback - whether good or critical we always want to work to improve your experience.',
      x: feedbackX,
      y: sectionY + 70,
      width: 140,
      style: {
        fontSize: '8',
        color: '#6B7280',
        textAlign: 'left',
      },
    });
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
        fillColor: isEmpty ? 'var(--color-warning-light)' : '#FFFFFF',
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
