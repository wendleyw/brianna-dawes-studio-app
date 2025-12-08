/**
 * Miro Client Report Service
 *
 * Generates enhanced visual client reports with:
 * - Weekly breakdown of deliverables
 * - Bar charts for assets and bonus counts
 * - Funnel/pyramid visualizations
 * - Client satisfaction tracking
 */

import type { Project } from '@features/projects/domain/project.types';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import { formatDateShort } from '@shared/lib/dateFormat';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('MiroClientReport');

// Report Layout Constants
const REPORT = {
  FRAME_WIDTH: 1400,
  FRAME_HEIGHT: 2000,
  PADDING: 40,
  SECTION_GAP: 30,
  HEADER_HEIGHT: 100,
  CARD_HEIGHT: 100,
  CARD_GAP: 20,
};

// Chart Colors
const CHART_COLORS = {
  assets: '#3B82F6',      // Blue
  bonus: '#8B5CF6',       // Purple
  approved: '#22C55E',    // Green
  inProgress: '#F59E0B',  // Yellow
  pending: '#6B7280',     // Gray
  rejected: '#EF4444',    // Red
  primary: '#050038',     // Brand primary
  accent: '#2563EB',      // Brand accent
};

// Satisfaction Levels
const SATISFACTION_LEVELS = [
  { level: 5, label: 'Excellent', color: '#22C55E', emoji: '🌟' },
  { level: 4, label: 'Good', color: '#84CC16', emoji: '😊' },
  { level: 3, label: 'Satisfactory', color: '#F59E0B', emoji: '😐' },
  { level: 2, label: 'Needs Improvement', color: '#F97316', emoji: '😕' },
  { level: 1, label: 'Poor', color: '#EF4444', emoji: '😞' },
];

export interface WeeklyData {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  assets: number;
  bonus: number;
  deliverables: Deliverable[];
  projects: Project[];
}

export interface ClientReportData {
  clientName: string;
  clientEmail?: string;
  projects: Project[];
  deliverables: Deliverable[];
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedBy: string;
  satisfactionRating?: number; // 1-5
  satisfactionNotes?: string;
}

export interface ClientReportMetrics {
  totalAssets: number;
  totalBonus: number;
  totalProjects: number;
  completedProjects: number;
  deliverablesByStatus: Record<string, number>;
  weeklyData: WeeklyData[];
}

function getMiroSDK() {
  if (typeof window === 'undefined' || !window.miro) {
    throw new Error('Miro SDK not available. Make sure you are running inside Miro.');
  }
  return window.miro;
}

/**
 * Get the week number of a date
 */
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Format week range label
 */
function formatWeekLabel(startDate: Date, endDate: Date): string {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

/**
 * Break date range into weeks
 */
function getWeeksInRange(startDate: string, endDate: string): { start: Date; end: Date; weekNum: number }[] {
  const weeks: { start: Date; end: Date; weekNum: number }[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Adjust start to beginning of week (Sunday)
  const currentStart = new Date(start);
  currentStart.setDate(currentStart.getDate() - currentStart.getDay());

  while (currentStart <= end) {
    const weekEnd = new Date(currentStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      start: new Date(currentStart),
      end: weekEnd > end ? new Date(end) : weekEnd,
      weekNum: getWeekNumber(currentStart),
    });

    currentStart.setDate(currentStart.getDate() + 7);
  }

  return weeks;
}

/**
 * Calculate report metrics with weekly breakdown
 */
function calculateClientMetrics(data: ClientReportData): ClientReportMetrics {
  const weeks = getWeeksInRange(data.startDate, data.endDate);

  const weeklyData: WeeklyData[] = weeks.map((week, index) => {
    const weekDeliverables = data.deliverables.filter(d => {
      const createdAt = new Date(d.createdAt);
      return createdAt >= week.start && createdAt <= week.end;
    });

    const weekProjects = data.projects.filter(p => {
      const createdAt = new Date(p.createdAt);
      return createdAt >= week.start && createdAt <= week.end;
    });

    return {
      weekNumber: index + 1,
      weekLabel: formatWeekLabel(week.start, week.end),
      startDate: week.start.toISOString(),
      endDate: week.end.toISOString(),
      assets: weekDeliverables.reduce((sum, d) => sum + (d.count || 0), 0),
      bonus: weekDeliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0),
      deliverables: weekDeliverables,
      projects: weekProjects,
    };
  });

  const deliverablesByStatus: Record<string, number> = {
    draft: 0,
    in_progress: 0,
    in_review: 0,
    approved: 0,
    rejected: 0,
    delivered: 0,
  };

  for (const d of data.deliverables) {
    deliverablesByStatus[d.status] = (deliverablesByStatus[d.status] || 0) + 1;
  }

  return {
    totalAssets: data.deliverables.reduce((sum, d) => sum + (d.count || 0), 0),
    totalBonus: data.deliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0),
    totalProjects: data.projects.length,
    completedProjects: data.projects.filter(p => p.status === 'done').length,
    deliverablesByStatus,
    weeklyData,
  };
}

class MiroClientReportService {
  /**
   * Generate enhanced client report with charts
   */
  async generateClientReport(data: ClientReportData, position?: { x: number; y: number }): Promise<string> {
    const miro = getMiroSDK();

    logger.info('Generating enhanced client report', {
      client: data.clientName,
      projectCount: data.projects.length,
      dateRange: `${data.startDate} to ${data.endDate}`,
    });

    const metrics = calculateClientMetrics(data);

    // Adjust frame height based on content
    const weekCount = metrics.weeklyData.length;
    const dynamicHeight = REPORT.FRAME_HEIGHT + Math.max(0, (weekCount - 4) * 50);

    const frameX = position?.x ?? 4000;
    const frameY = position?.y ?? 0;

    // Create main report frame
    const reportFrame = await miro.board.createFrame({
      title: `📊 CLIENT REPORT - ${data.clientName.toUpperCase()}`,
      x: frameX,
      y: frameY,
      width: REPORT.FRAME_WIDTH,
      height: dynamicHeight,
      style: {
        fillColor: '#FFFFFF',
      },
    });

    const frameLeft = frameX - REPORT.FRAME_WIDTH / 2;
    const frameTop = frameY - dynamicHeight / 2;
    let currentY = frameTop + REPORT.PADDING;

    // === HEADER ===
    await this.createHeader(data, frameX, currentY);
    currentY += REPORT.HEADER_HEIGHT + REPORT.SECTION_GAP;

    // === SUMMARY CARDS ===
    await this.createSummaryCards(metrics, frameX, currentY);
    currentY += REPORT.CARD_HEIGHT + REPORT.SECTION_GAP + 20;

    // === WEEKLY BAR CHART ===
    await this.createWeeklyBarChart(metrics.weeklyData, frameLeft + REPORT.PADDING, currentY, REPORT.FRAME_WIDTH - REPORT.PADDING * 2);
    currentY += 300 + REPORT.SECTION_GAP;

    // === DELIVERABLES FUNNEL ===
    await this.createDeliverablesFunnel(metrics.deliverablesByStatus, frameX, currentY);
    currentY += 280 + REPORT.SECTION_GAP;

    // === CLIENT SATISFACTION ===
    if (data.satisfactionRating) {
      await this.createSatisfactionSection(data.satisfactionRating, data.satisfactionNotes, frameX, currentY);
      currentY += 200 + REPORT.SECTION_GAP;
    }

    // === WEEKLY BREAKDOWN TABLE ===
    await this.createWeeklyBreakdownTable(metrics.weeklyData, frameLeft + REPORT.PADDING, currentY, REPORT.FRAME_WIDTH - REPORT.PADDING * 2);

    // Zoom to report
    await miro.board.viewport.zoomTo([reportFrame]);

    logger.info('Enhanced client report generated', { frameId: reportFrame.id });
    return reportFrame.id;
  }

  /**
   * Create report header
   */
  private async createHeader(data: ClientReportData, centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Title bar
    await miro.board.createShape({
      shape: 'rectangle',
      content: `<p><b>📊 CLIENT REPORT</b></p>`,
      x: centerX,
      y: topY + 30,
      width: contentWidth,
      height: 60,
      style: {
        fillColor: CHART_COLORS.primary,
        color: '#FFFFFF',
        fontSize: 24,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Subtitle with date range
    const dateRange = `${formatDateShort(data.startDate)} - ${formatDateShort(data.endDate)}`;
    await miro.board.createText({
      content: `<b>${data.clientName}</b> | ${dateRange} | Generated by ${data.generatedBy}`,
      x: centerX,
      y: topY + 80,
      width: contentWidth,
      style: {
        fontSize: 14,
        textAlign: 'center',
        color: '#6B7280',
      },
    });
  }

  /**
   * Create summary metric cards
   */
  private async createSummaryCards(metrics: ClientReportMetrics, centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();

    const cards = [
      { label: 'TOTAL ASSETS', value: metrics.totalAssets.toString(), color: CHART_COLORS.assets, icon: '📦' },
      { label: 'BONUS ITEMS', value: metrics.totalBonus.toString(), color: CHART_COLORS.bonus, icon: '🎁' },
      { label: 'PROJECTS', value: metrics.totalProjects.toString(), color: CHART_COLORS.accent, icon: '📁' },
      { label: 'COMPLETED', value: metrics.completedProjects.toString(), color: CHART_COLORS.approved, icon: '✅' },
    ];

    const cardWidth = 280;
    const totalWidth = cards.length * cardWidth + (cards.length - 1) * REPORT.CARD_GAP;
    const startX = centerX - totalWidth / 2 + cardWidth / 2;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (!card) continue;

      const cardX = startX + i * (cardWidth + REPORT.CARD_GAP);
      const cardY = topY + REPORT.CARD_HEIGHT / 2;

      // Card background
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: '',
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: REPORT.CARD_HEIGHT,
        style: {
          fillColor: '#F8FAFC',
          borderColor: card.color,
          borderWidth: 2,
        },
      });

      // Icon and Value
      await miro.board.createText({
        content: `<b>${card.icon} ${card.value}</b>`,
        x: cardX,
        y: cardY - 10,
        width: cardWidth - 20,
        style: {
          fontSize: 36,
          textAlign: 'center',
          color: card.color,
        },
      });

      // Label
      await miro.board.createText({
        content: card.label,
        x: cardX,
        y: cardY + 30,
        width: cardWidth - 20,
        style: {
          fontSize: 12,
          textAlign: 'center',
          color: '#6B7280',
        },
      });
    }
  }

  /**
   * Create weekly bar chart visualization
   */
  private async createWeeklyBarChart(weeklyData: WeeklyData[], startX: number, topY: number, width: number): Promise<void> {
    const miro = getMiroSDK();

    // Section title
    await miro.board.createText({
      content: '<b>📈 WEEKLY PERFORMANCE</b>',
      x: startX + width / 2,
      y: topY,
      width: width,
      style: {
        fontSize: 16,
        textAlign: 'left',
        color: '#1F2937',
      },
    });

    const chartTop = topY + 40;
    const chartHeight = 200;
    const chartWidth = width - 100;
    const barAreaWidth = chartWidth - 60;

    // Find max value for scaling
    const maxValue = Math.max(
      ...weeklyData.map(w => Math.max(w.assets, w.bonus)),
      1
    );

    // Y-axis labels
    const yLabels = [maxValue, Math.round(maxValue / 2), 0];
    for (let i = 0; i < yLabels.length; i++) {
      const yPos = chartTop + (i * chartHeight / 2);
      await miro.board.createText({
        content: yLabels[i]?.toString() || '0',
        x: startX + 25,
        y: yPos + 30,
        width: 40,
        style: {
          fontSize: 10,
          textAlign: 'right',
          color: '#9CA3AF',
        },
      });

      // Grid line
      await miro.board.createShape({
        shape: 'rectangle',
        content: '',
        x: startX + 60 + barAreaWidth / 2,
        y: yPos + 30,
        width: barAreaWidth,
        height: 1,
        style: {
          fillColor: '#E5E7EB',
          borderWidth: 0,
        },
      });
    }

    // Bars for each week
    const maxWeeksToShow = Math.min(weeklyData.length, 8);
    const barGroupWidth = barAreaWidth / maxWeeksToShow;
    const singleBarWidth = (barGroupWidth - 20) / 2;

    for (let i = 0; i < maxWeeksToShow; i++) {
      const week = weeklyData[i];
      if (!week) continue;

      const groupX = startX + 60 + i * barGroupWidth + barGroupWidth / 2;
      const baseY = chartTop + chartHeight + 30;

      // Assets bar
      const assetsHeight = maxValue > 0 ? (week.assets / maxValue) * chartHeight : 0;
      if (assetsHeight > 0) {
        await miro.board.createShape({
          shape: 'rectangle',
          content: '',
          x: groupX - singleBarWidth / 2 - 2,
          y: baseY - assetsHeight / 2,
          width: singleBarWidth,
          height: assetsHeight,
          style: {
            fillColor: CHART_COLORS.assets,
            borderWidth: 0,
          },
        });

        // Value label
        await miro.board.createText({
          content: week.assets.toString(),
          x: groupX - singleBarWidth / 2 - 2,
          y: baseY - assetsHeight - 12,
          width: singleBarWidth,
          style: {
            fontSize: 10,
            textAlign: 'center',
            color: CHART_COLORS.assets,
          },
        });
      }

      // Bonus bar
      const bonusHeight = maxValue > 0 ? (week.bonus / maxValue) * chartHeight : 0;
      if (bonusHeight > 0) {
        await miro.board.createShape({
          shape: 'rectangle',
          content: '',
          x: groupX + singleBarWidth / 2 + 2,
          y: baseY - bonusHeight / 2,
          width: singleBarWidth,
          height: bonusHeight,
          style: {
            fillColor: CHART_COLORS.bonus,
            borderWidth: 0,
          },
        });

        // Value label
        await miro.board.createText({
          content: week.bonus.toString(),
          x: groupX + singleBarWidth / 2 + 2,
          y: baseY - bonusHeight - 12,
          width: singleBarWidth,
          style: {
            fontSize: 10,
            textAlign: 'center',
            color: CHART_COLORS.bonus,
          },
        });
      }

      // Week label
      await miro.board.createText({
        content: `W${week.weekNumber}`,
        x: groupX,
        y: baseY + 15,
        width: barGroupWidth - 10,
        style: {
          fontSize: 10,
          textAlign: 'center',
          color: '#6B7280',
        },
      });
    }

    // Legend
    const legendY = chartTop + chartHeight + 50;
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: startX + width - 180,
      y: legendY,
      width: 15,
      height: 15,
      style: {
        fillColor: CHART_COLORS.assets,
        borderWidth: 0,
      },
    });
    await miro.board.createText({
      content: 'Assets',
      x: startX + width - 140,
      y: legendY,
      width: 50,
      style: { fontSize: 11, textAlign: 'left', color: '#374151' },
    });

    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: startX + width - 80,
      y: legendY,
      width: 15,
      height: 15,
      style: {
        fillColor: CHART_COLORS.bonus,
        borderWidth: 0,
      },
    });
    await miro.board.createText({
      content: 'Bonus',
      x: startX + width - 40,
      y: legendY,
      width: 50,
      style: { fontSize: 11, textAlign: 'left', color: '#374151' },
    });
  }

  /**
   * Create deliverables funnel/pyramid visualization
   */
  private async createDeliverablesFunnel(byStatus: Record<string, number>, centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Section title
    await miro.board.createText({
      content: '<b>🔻 DELIVERABLES FUNNEL</b>',
      x: centerX,
      y: topY,
      width: contentWidth,
      style: {
        fontSize: 16,
        textAlign: 'left',
        color: '#1F2937',
      },
    });

    const funnelTop = topY + 40;
    const funnelStages = [
      { status: 'draft', label: 'Draft', color: '#9CA3AF' },
      { status: 'in_progress', label: 'In Progress', color: '#F59E0B' },
      { status: 'in_review', label: 'In Review', color: '#3B82F6' },
      { status: 'approved', label: 'Approved', color: '#22C55E' },
      { status: 'delivered', label: 'Delivered', color: '#10B981' },
    ];

    const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const maxWidth = 500;
    const stageHeight = 40;
    const stageGap = 5;

    for (let i = 0; i < funnelStages.length; i++) {
      const stage = funnelStages[i];
      if (!stage) continue;

      const count = byStatus[stage.status] || 0;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      // Calculate width (funnel shape - wider at top, narrower at bottom)
      const widthRatio = 1 - (i * 0.15);
      const stageWidth = Math.max(maxWidth * widthRatio, 200);

      const stageY = funnelTop + i * (stageHeight + stageGap);

      // Stage bar (using round_rectangle as trapezoid is not supported)
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: '',
        x: centerX,
        y: stageY + stageHeight / 2,
        width: stageWidth,
        height: stageHeight,
        style: {
          fillColor: count > 0 ? stage.color : '#E5E7EB',
          borderWidth: 0,
        },
      });

      // Label with count
      await miro.board.createText({
        content: `<b>${stage.label}</b>: ${count} (${percentage}%)`,
        x: centerX,
        y: stageY + stageHeight / 2,
        width: stageWidth - 20,
        style: {
          fontSize: 12,
          textAlign: 'center',
          color: count > 0 ? '#FFFFFF' : '#9CA3AF',
        },
      });
    }

    // Rejected count (shown separately)
    const rejectedCount = byStatus['rejected'] || 0;
    if (rejectedCount > 0) {
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><b>❌ Rejected: ${rejectedCount}</b></p>`,
        x: centerX + 320,
        y: funnelTop + 100,
        width: 140,
        height: 40,
        style: {
          fillColor: CHART_COLORS.rejected,
          borderWidth: 0,
          color: '#FFFFFF',
          fontSize: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });
    }
  }

  /**
   * Create client satisfaction section with pyramid/rating visualization
   */
  private async createSatisfactionSection(rating: number, notes: string | undefined, centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Section title
    await miro.board.createText({
      content: '<b>⭐ CLIENT SATISFACTION</b>',
      x: centerX,
      y: topY,
      width: contentWidth,
      style: {
        fontSize: 16,
        textAlign: 'left',
        color: '#1F2937',
      },
    });

    const satisfactionTop = topY + 40;
    const starSize = 50;
    const starGap = 10;
    const startX = centerX - ((5 * (starSize + starGap) - starGap) / 2) + starSize / 2;

    // Star rating display
    for (let i = 1; i <= 5; i++) {
      const starX = startX + (i - 1) * (starSize + starGap);
      const isFilled = i <= rating;
      const level = SATISFACTION_LEVELS.find(l => l.level === i);

      // Using circle since star shape is not supported in Miro SDK
      await miro.board.createShape({
        shape: 'circle',
        content: isFilled ? '\u2605' : '\u2606',
        x: starX,
        y: satisfactionTop + starSize / 2,
        width: starSize,
        height: starSize,
        style: {
          fillColor: isFilled ? (level?.color || '#F59E0B') : '#E5E7EB',
          borderWidth: 0,
        },
      });
    }

    // Current satisfaction level label
    const currentLevel = SATISFACTION_LEVELS.find(l => l.level === rating);
    if (currentLevel) {
      await miro.board.createText({
        content: `<b>${currentLevel.emoji} ${currentLevel.label}</b>`,
        x: centerX,
        y: satisfactionTop + starSize + 25,
        width: 300,
        style: {
          fontSize: 18,
          textAlign: 'center',
          color: currentLevel.color,
        },
      });
    }

    // Notes
    if (notes) {
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: `<p><i>"${notes}"</i></p>`,
        x: centerX,
        y: satisfactionTop + starSize + 80,
        width: 500,
        height: 60,
        style: {
          fillColor: '#F8FAFC',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          color: '#6B7280',
          fontSize: 12,
          textAlign: 'center',
          textAlignVertical: 'middle',
        },
      });
    }
  }

  /**
   * Create weekly breakdown table
   */
  private async createWeeklyBreakdownTable(weeklyData: WeeklyData[], startX: number, topY: number, width: number): Promise<void> {
    const miro = getMiroSDK();

    // Section title
    await miro.board.createText({
      content: '<b>📅 WEEKLY BREAKDOWN</b>',
      x: startX + width / 2,
      y: topY,
      width: width,
      style: {
        fontSize: 16,
        textAlign: 'left',
        color: '#1F2937',
      },
    });

    const tableTop = topY + 30;
    const rowHeight = 35;
    const colWidths = [150, 100, 100, 150];
    const headers = ['Week', 'Assets', 'Bonus', 'Deliverables'];

    // Header row
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: startX + width / 2,
      y: tableTop + rowHeight / 2,
      width: width,
      height: rowHeight,
      style: {
        fillColor: CHART_COLORS.primary,
        borderWidth: 0,
      },
    });

    let headerX = startX + 20;
    for (let i = 0; i < headers.length; i++) {
      const colWidth = colWidths[i] || 100;
      await miro.board.createText({
        content: `<b>${headers[i]}</b>`,
        x: headerX + colWidth / 2,
        y: tableTop + rowHeight / 2,
        width: colWidth,
        style: {
          fontSize: 12,
          textAlign: 'center',
          color: '#FFFFFF',
        },
      });
      headerX += colWidth + 10;
    }

    // Data rows
    const maxRows = Math.min(weeklyData.length, 12);
    for (let i = 0; i < maxRows; i++) {
      const week = weeklyData[i];
      if (!week) continue;

      const rowY = tableTop + rowHeight + i * rowHeight + rowHeight / 2;

      // Row background
      await miro.board.createShape({
        shape: 'rectangle',
        content: '',
        x: startX + width / 2,
        y: rowY,
        width: width,
        height: rowHeight - 2,
        style: {
          fillColor: i % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
          borderColor: '#E5E7EB',
          borderWidth: 1,
        },
      });

      // Row data
      const rowData = [
        week.weekLabel,
        week.assets.toString(),
        week.bonus.toString(),
        week.deliverables.length.toString(),
      ];

      let cellX = startX + 20;
      for (let j = 0; j < rowData.length; j++) {
        const colWidth = colWidths[j] || 100;
        const cellColor = j === 1 ? CHART_COLORS.assets : j === 2 ? CHART_COLORS.bonus : '#374151';

        await miro.board.createText({
          content: j === 0 ? rowData[j] || '' : `<b>${rowData[j]}</b>`,
          x: cellX + colWidth / 2,
          y: rowY,
          width: colWidth,
          style: {
            fontSize: 11,
            textAlign: 'center',
            color: cellColor,
          },
        });
        cellX += colWidth + 10;
      }
    }

    // Total row
    const totalY = tableTop + rowHeight + maxRows * rowHeight + rowHeight / 2;
    await miro.board.createShape({
      shape: 'rectangle',
      content: '',
      x: startX + width / 2,
      y: totalY,
      width: width,
      height: rowHeight,
      style: {
        fillColor: '#F3F4F6',
        borderColor: CHART_COLORS.primary,
        borderWidth: 2,
      },
    });

    const totalAssets = weeklyData.reduce((sum, w) => sum + w.assets, 0);
    const totalBonus = weeklyData.reduce((sum, w) => sum + w.bonus, 0);
    const totalDeliverables = weeklyData.reduce((sum, w) => sum + w.deliverables.length, 0);
    const totals = ['TOTAL', totalAssets.toString(), totalBonus.toString(), totalDeliverables.toString()];

    let totalX = startX + 20;
    for (let j = 0; j < totals.length; j++) {
      const colWidth = colWidths[j] || 100;
      await miro.board.createText({
        content: `<b>${totals[j]}</b>`,
        x: totalX + colWidth / 2,
        y: totalY,
        width: colWidth,
        style: {
          fontSize: 12,
          textAlign: 'center',
          color: CHART_COLORS.primary,
        },
      });
      totalX += colWidth + 10;
    }
  }
}

export const miroClientReportService = new MiroClientReportService();
