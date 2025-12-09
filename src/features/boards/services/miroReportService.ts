/**
 * Miro Report Service
 *
 * Generates visual reports directly on Miro boards.
 * Creates a comprehensive frame with project metrics, status breakdown,
 * and client information.
 */

import type { Project, ProjectStatus } from '@features/projects/domain/project.types';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import { STATUS_COLUMNS, getStatusProgress } from '@shared/lib/timelineStatus';
import { PRIORITY_CONFIG } from '@shared/lib/priorityConfig';
import { formatDateFull, formatDateShort } from '@shared/lib/dateFormat';
import { createLogger } from '@shared/lib/logger';
import { miroAdapter } from '@shared/lib/miroAdapter';

const logger = createLogger('MiroReport');

// Report Layout Constants
const REPORT = {
  FRAME_WIDTH: 1200,
  FRAME_HEIGHT: 1600,
  PADDING: 30,
  SECTION_GAP: 20,
  HEADER_HEIGHT: 80,
  ROW_HEIGHT: 40,
  CARD_WIDTH: 280,
  CARD_HEIGHT: 120,
  CARD_GAP: 15,
};

interface ReportData {
  clientName: string;
  clientEmail?: string;
  projects: Project[];
  deliverables: Deliverable[];
  generatedAt: string;
  generatedBy: string;
}

interface ProjectMetrics {
  total: number;
  byStatus: Record<ProjectStatus, number>;
  completionRate: number;
  overdueCount: number;
  urgentCount: number;
}

interface DeliverableMetrics {
  total: number;
  approved: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

/**
 * Get Miro SDK instance
 * Uses the unified miroAdapter for consistent access
 */
function getMiroSDK() {
  return miroAdapter.getSDK();
}

/**
 * Calculate project metrics from a list of projects
 * NOTE: Using simplified 5-status system
 */
function calculateProjectMetrics(projects: Project[]): ProjectMetrics {
  const byStatus: Record<ProjectStatus, number> = {
    overdue: 0,
    urgent: 0,
    in_progress: 0,
    review: 0,
    done: 0,
  };

  let overdueCount = 0;
  let urgentCount = 0;
  let doneCount = 0;

  for (const project of projects) {
    byStatus[project.status] = (byStatus[project.status] || 0) + 1;

    // Count overdue for the "overdue" metric
    if (project.status === 'overdue') {
      overdueCount++;
    }
    // Count urgent status for the "urgent" metric
    if (project.status === 'urgent' || project.priority === 'urgent') {
      urgentCount++;
    }
    if (project.status === 'done') {
      doneCount++;
    }
  }

  return {
    total: projects.length,
    byStatus,
    completionRate: projects.length > 0 ? Math.round((doneCount / projects.length) * 100) : 0,
    overdueCount,
    urgentCount,
  };
}

/**
 * Calculate deliverable metrics
 */
function calculateDeliverableMetrics(deliverables: Deliverable[]): DeliverableMetrics {
  let approved = 0;
  let inProgress = 0;
  let pending = 0;

  for (const d of deliverables) {
    if (d.status === 'approved' || d.status === 'delivered') {
      approved++;
    } else if (d.status === 'in_progress' || d.status === 'in_review') {
      inProgress++;
    } else {
      pending++;
    }
  }

  return {
    total: deliverables.length,
    approved,
    inProgress,
    pending,
    completionRate: deliverables.length > 0 ? Math.round((approved / deliverables.length) * 100) : 0,
  };
}

class MiroReportService {
  /**
   * Generate a client report frame on the Miro board
   */
  async generateClientReport(data: ReportData, position?: { x: number; y: number }): Promise<string> {
    const miro = getMiroSDK();

    logger.info('Generating client report', { client: data.clientName, projectCount: data.projects.length });

    // Calculate metrics
    const projectMetrics = calculateProjectMetrics(data.projects);
    const deliverableMetrics = calculateDeliverableMetrics(data.deliverables);

    // Determine position (to the right of existing content or at specified position)
    const frameX = position?.x ?? 3000;
    const frameY = position?.y ?? 0;

    // Create main report frame
    const reportFrame = await miro.board.createFrame({
      title: `📊 CLIENT REPORT - ${data.clientName.toUpperCase()}`,
      x: frameX,
      y: frameY,
      width: REPORT.FRAME_WIDTH,
      height: REPORT.FRAME_HEIGHT,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    const frameLeft = frameX - REPORT.FRAME_WIDTH / 2;
    const frameTop = frameY - REPORT.FRAME_HEIGHT / 2;
    let currentY = frameTop + REPORT.PADDING;

    // === HEADER SECTION ===
    await this.createHeaderSection(
      data.clientName,
      data.generatedAt,
      data.generatedBy,
      frameX,
      currentY
    );
    currentY += REPORT.HEADER_HEIGHT + REPORT.SECTION_GAP;

    // === SUMMARY METRICS ===
    await this.createSummaryCards(
      projectMetrics,
      deliverableMetrics,
      frameLeft + REPORT.PADDING,
      currentY
    );
    currentY += REPORT.CARD_HEIGHT + REPORT.SECTION_GAP + 20;

    // === STATUS BREAKDOWN ===
    await this.createStatusBreakdown(
      projectMetrics.byStatus,
      frameX,
      currentY
    );
    currentY += 180 + REPORT.SECTION_GAP;

    // === PROJECTS LIST ===
    await this.createProjectsSection(
      data.projects,
      frameLeft + REPORT.PADDING,
      currentY,
      REPORT.FRAME_WIDTH - REPORT.PADDING * 2
    );
    currentY += Math.min(data.projects.length * REPORT.ROW_HEIGHT + 60, 400) + REPORT.SECTION_GAP;

    // === DELIVERABLES SUMMARY ===
    await this.createDeliverablesSection(
      data.deliverables,
      frameX,
      currentY
    );

    // Zoom to the report
    await miro.board.viewport.zoomTo([reportFrame]);

    logger.info('Report generated successfully', { frameId: reportFrame.id });
    return reportFrame.id;
  }

  /**
   * Create the report header
   */
  private async createHeaderSection(
    clientName: string,
    generatedAt: string,
    generatedBy: string,
    centerX: number,
    topY: number
  ): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Main title bar
    await miro.board.createShape({
      shape: 'rectangle',
      content: `<p><b>📊 CLIENT REPORT</b></p>`,
      x: centerX,
      y: topY + 25,
      width: contentWidth,
      height: 50,
      style: {
        fillColor: '#000000',
        color: '#FFFFFF',
        fontSize: 18,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Client name and date
    await miro.board.createText({
      content: `<b>${clientName}</b> | Generated: ${formatDateFull(generatedAt)} by ${generatedBy}`,
      x: centerX,
      y: topY + 65,
      width: contentWidth,
      style: {
        fontSize: 12,
        textAlign: 'center',
        color: '#6B7280',
      },
    });
  }

  /**
   * Create summary metric cards
   */
  private async createSummaryCards(
    projectMetrics: ProjectMetrics,
    deliverableMetrics: DeliverableMetrics,
    startX: number,
    topY: number
  ): Promise<void> {
    const miro = getMiroSDK();

    const cards = [
      { label: 'TOTAL PROJECTS', value: projectMetrics.total.toString(), color: '#3B82F6' },
      { label: 'COMPLETION RATE', value: `${projectMetrics.completionRate}%`, color: '#22C55E' },
      { label: 'DELIVERABLES', value: deliverableMetrics.total.toString(), color: '#8B5CF6' },
      { label: 'OVERDUE', value: projectMetrics.overdueCount.toString(), color: projectMetrics.overdueCount > 0 ? '#EF4444' : '#9CA3AF' },
    ];

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;

      const cardX = startX + REPORT.CARD_WIDTH / 2 + i * (REPORT.CARD_WIDTH + REPORT.CARD_GAP);
      const cardY = topY + REPORT.CARD_HEIGHT / 2;

      // Card background
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: '',
        x: cardX,
        y: cardY,
        width: REPORT.CARD_WIDTH,
        height: REPORT.CARD_HEIGHT,
        style: {
          fillColor: '#F9FAFB',
          borderColor: '#E5E7EB',
          borderWidth: 1,
        },
      });

      // Card accent bar
      await miro.board.createShape({
        shape: 'rectangle',
        content: '',
        x: cardX - REPORT.CARD_WIDTH / 2 + 4,
        y: cardY,
        width: 8,
        height: REPORT.CARD_HEIGHT - 20,
        style: {
          fillColor: card.color,
          borderWidth: 0,
        },
      });

      // Value (big number)
      await miro.board.createText({
        content: `<b>${card.value}</b>`,
        x: cardX + 10,
        y: cardY - 15,
        width: REPORT.CARD_WIDTH - 30,
        style: {
          fontSize: 32,
          textAlign: 'center',
          color: '#000000',
        },
      });

      // Label
      await miro.board.createText({
        content: card.label,
        x: cardX + 10,
        y: cardY + 30,
        width: REPORT.CARD_WIDTH - 30,
        style: {
          fontSize: 11,
          textAlign: 'center',
          color: '#6B7280',
        },
      });
    }
  }

  /**
   * Create status breakdown visualization
   */
  private async createStatusBreakdown(
    byStatus: Record<ProjectStatus, number>,
    centerX: number,
    topY: number
  ): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Section title
    await miro.board.createText({
      content: '<b>PROJECT STATUS BREAKDOWN</b>',
      x: centerX,
      y: topY + 10,
      width: contentWidth,
      style: {
        fontSize: 14,
        textAlign: 'left',
        color: '#374151',
      },
    });

    // Status pills
    const statusY = topY + 50;
    const pillWidth = 140;
    const pillHeight = 50;
    const pillGap = 10;
    const startX = centerX - ((STATUS_COLUMNS.length * (pillWidth + pillGap) - pillGap) / 2) + pillWidth / 2;

    for (let i = 0; i < STATUS_COLUMNS.length; i++) {
      const col = STATUS_COLUMNS[i];
      if (!col) continue;

      const count = byStatus[col.id] || 0;
      const pillX = startX + i * (pillWidth + pillGap);

      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>${col.label}</b></p><p>${count}</p>`,
        x: pillX,
        y: statusY,
        width: pillWidth,
        height: pillHeight,
        style: {
          fillColor: count > 0 ? col.color : '#E5E7EB',
          borderWidth: 0,
          color: count > 0 ? '#FFFFFF' : '#9CA3AF',
          fontSize: 11,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });
    }

    // Progress bar
    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const barY = statusY + 70;
      const barWidth = contentWidth - 100;
      const barHeight = 24;
      const barX = centerX;

      // Background bar
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: '',
        x: barX,
        y: barY,
        width: barWidth,
        height: barHeight,
        style: {
          fillColor: '#E5E7EB',
          borderWidth: 0,
        },
      });

      // Progress segments
      let currentX = barX - barWidth / 2;
      for (const col of STATUS_COLUMNS) {
        const count = byStatus[col.id] || 0;
        if (count === 0) continue;

        const segmentWidth = (count / total) * barWidth;
        await miro.board.createShape({
          shape: 'rectangle',
          content: '',
          x: currentX + segmentWidth / 2,
          y: barY,
          width: segmentWidth,
          height: barHeight,
          style: {
            fillColor: col.color,
            borderWidth: 0,
          },
        });
        currentX += segmentWidth;
      }
    }
  }

  /**
   * Create projects list section
   */
  private async createProjectsSection(
    projects: Project[],
    startX: number,
    topY: number,
    width: number
  ): Promise<void> {
    const miro = getMiroSDK();

    // Section title
    await miro.board.createText({
      content: '<b>PROJECTS</b>',
      x: startX + width / 2,
      y: topY + 10,
      width: width,
      style: {
        fontSize: 14,
        textAlign: 'left',
        color: '#374151',
      },
    });

    // Table header
    const headerY = topY + 40;
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: startX + width / 2,
      y: headerY,
      width: width,
      height: 30,
      style: {
        fillColor: '#F3F4F6',
        borderColor: '#E5E7EB',
        borderWidth: 1,
      },
    });

    // Header labels
    const columns = [
      { label: 'Project', x: startX + 120 },
      { label: 'Status', x: startX + 320 },
      { label: 'Priority', x: startX + 440 },
      { label: 'Due Date', x: startX + 560 },
      { label: 'Progress', x: startX + 700 },
    ];

    for (const col of columns) {
      await miro.board.createText({
        content: `<b>${col.label}</b>`,
        x: col.x,
        y: headerY,
        width: 100,
        style: {
          fontSize: 10,
          textAlign: 'left',
          color: '#6B7280',
        },
      });
    }

    // Project rows (max 8)
    const displayProjects = projects.slice(0, 8);
    for (let i = 0; i < displayProjects.length; i++) {
      const project = displayProjects[i];
      if (!project) continue;

      const rowY = headerY + 30 + i * REPORT.ROW_HEIGHT;
      const statusCol = STATUS_COLUMNS.find(c => c.id === project.status);
      const priorityConfig = PRIORITY_CONFIG[project.priority];

      // Row background (alternating)
      await miro.board.createShape({
        shape: 'rectangle',
        content: '',
        x: startX + width / 2,
        y: rowY,
        width: width,
        height: REPORT.ROW_HEIGHT - 2,
        style: {
          fillColor: i % 2 === 0 ? '#FFFFFF' : '#F9FAFB',
          borderColor: '#E5E7EB',
          borderWidth: 1,
        },
      });

      // Project name
      await miro.board.createText({
        content: project.name.length > 25 ? project.name.substring(0, 22) + '...' : project.name,
        x: columns[0]?.x || startX + 120,
        y: rowY,
        width: 180,
        style: {
          fontSize: 11,
          textAlign: 'left',
          color: '#000000',
        },
      });

      // Status badge
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>${statusCol?.label || project.status}</b></p>`,
        x: columns[1]?.x || startX + 320,
        y: rowY,
        width: 90,
        height: 22,
        style: {
          fillColor: statusCol?.color || '#6B7280',
          borderWidth: 0,
          color: '#FFFFFF',
          fontSize: 9,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });

      // Priority badge
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>${priorityConfig?.label || project.priority}</b></p>`,
        x: columns[2]?.x || startX + 440,
        y: rowY,
        width: 70,
        height: 22,
        style: {
          fillColor: priorityConfig?.color || '#6B7280',
          borderWidth: 0,
          color: '#FFFFFF',
          fontSize: 9,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });

      // Due date
      await miro.board.createText({
        content: project.dueDate ? formatDateShort(project.dueDate) : '—',
        x: columns[3]?.x || startX + 560,
        y: rowY,
        width: 80,
        style: {
          fontSize: 11,
          textAlign: 'left',
          color: '#6B7280',
        },
      });

      // Progress indicator (simple bar) using centralized function
      const progressWidth = 80;
      const progress = getStatusProgress(project.status);

      // Progress background
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: '',
        x: (columns[4]?.x || startX + 700) + progressWidth / 2 - 40,
        y: rowY,
        width: progressWidth,
        height: 12,
        style: {
          fillColor: '#E5E7EB',
          borderWidth: 0,
        },
      });

      // Progress fill
      if (progress > 0) {
        const fillWidth = (progress / 100) * progressWidth;
        await miro.board.createShape({
          shape: 'round_rectangle',
          content: '',
          x: (columns[4]?.x || startX + 700) - 40 + fillWidth / 2,
          y: rowY,
          width: fillWidth,
          height: 12,
          style: {
            fillColor: progress === 100 ? '#22C55E' : '#3B82F6',
            borderWidth: 0,
          },
        });
      }
    }

    // Show "more projects" indicator if needed
    if (projects.length > 8) {
      const moreY = headerY + 30 + 8 * REPORT.ROW_HEIGHT;
      await miro.board.createText({
        content: `+ ${projects.length - 8} more projects...`,
        x: startX + width / 2,
        y: moreY,
        width: width,
        style: {
          fontSize: 11,
          textAlign: 'center',
          color: '#9CA3AF',
        },
      });
    }
  }

  /**
   * Create deliverables summary section
   */
  private async createDeliverablesSection(
    deliverables: Deliverable[],
    centerX: number,
    topY: number
  ): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Section title
    await miro.board.createText({
      content: '<b>DELIVERABLES SUMMARY</b>',
      x: centerX,
      y: topY + 10,
      width: contentWidth,
      style: {
        fontSize: 14,
        textAlign: 'left',
        color: '#374151',
      },
    });

    const metrics = calculateDeliverableMetrics(deliverables);
    const summaryY = topY + 50;

    // Summary cards
    const items = [
      { label: 'Total', value: metrics.total, color: '#3B82F6' },
      { label: 'Approved', value: metrics.approved, color: '#22C55E' },
      { label: 'In Progress', value: metrics.inProgress, color: '#F59E0B' },
      { label: 'Pending', value: metrics.pending, color: '#6B7280' },
    ];

    const itemWidth = 120;
    const itemGap = 20;
    const startX = centerX - ((items.length * (itemWidth + itemGap) - itemGap) / 2) + itemWidth / 2;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) continue;

      const itemX = startX + i * (itemWidth + itemGap);

      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>${item.value}</b></p><p>${item.label}</p>`,
        x: itemX,
        y: summaryY,
        width: itemWidth,
        height: 60,
        style: {
          fillColor: '#FFFFFF',
          borderColor: item.color,
          borderWidth: 2,
          color: '#374151',
          fontSize: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });
    }

    // Completion rate
    await miro.board.createText({
      content: `<b>Overall Completion: ${metrics.completionRate}%</b>`,
      x: centerX,
      y: summaryY + 60,
      width: contentWidth,
      style: {
        fontSize: 14,
        textAlign: 'center',
        color: metrics.completionRate >= 80 ? '#22C55E' : metrics.completionRate >= 50 ? '#F59E0B' : '#EF4444',
      },
    });
  }
}

export const miroReportService = new MiroReportService();
