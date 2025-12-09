/**
 * Miro Client Report Service
 *
 * Generates enhanced visual client reports with:
 * - Weekly breakdown of deliverables
 * - Bar charts for assets and bonus counts
 * - Project type breakdown
 * - Client satisfaction tracking
 */

import type { Project } from '@features/projects/domain/project.types';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import { formatDateShort } from '@shared/lib/dateFormat';
import { createLogger } from '@shared/lib/logger';
import { miroAdapter } from '@shared/lib/miroAdapter';

const logger = createLogger('MiroClientReport');

// Report Layout Constants
const REPORT = {
  FRAME_WIDTH: 1200,
  FRAME_HEIGHT: 1600,
  PADDING: 40,
  SECTION_GAP: 25,
  HEADER_HEIGHT: 80,
  CARD_HEIGHT: 90,
  CARD_GAP: 16,
};

// Chart Colors
const CHART_COLORS = {
  assets: '#3B82F6',      // Blue
  bonus: '#8B5CF6',       // Purple
  approved: '#22C55E',    // Green
  inProgress: '#F59E0B',  // Yellow
  pending: '#6B7280',     // Gray
  rejected: '#EF4444',    // Red
  primary: '#050038',     // Brand primary (dark navy)
  accent: '#2563EB',      // Brand accent
};

// Satisfaction Levels with face icons (text-based faces for Miro compatibility)
const SATISFACTION_FACES = [
  { level: 1, label: 'Very Unhappy', color: '#EF4444', face: '😞', bgColor: '#FEE2E2' },
  { level: 2, label: 'Unhappy', color: '#F97316', face: '😕', bgColor: '#FFEDD5' },
  { level: 3, label: 'Neutral', color: '#F59E0B', face: '😐', bgColor: '#FEF3C7' },
  { level: 4, label: 'Happy', color: '#84CC16', face: '😊', bgColor: '#ECFCCB' },
  { level: 5, label: 'Very Happy', color: '#22C55E', face: '😄', bgColor: '#DCFCE7' },
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
}

export interface ClientReportMetrics {
  totalAssets: number;
  totalBonus: number;
  totalProjects: number;
  completedProjects: number;
  deliverablesByProjectType: Record<string, number>;
  weeklyData: WeeklyData[];
}

/**
 * Get Miro SDK instance
 * Uses the unified miroAdapter for consistent access
 */
function getMiroSDK() {
  return miroAdapter.getSDK();
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
 * Uses dueDate to distribute deliverables across weeks (if no dueDate, uses createdAt)
 */
function calculateClientMetrics(data: ClientReportData): ClientReportMetrics {
  const weeks = getWeeksInRange(data.startDate, data.endDate);

  // For weekly data, distribute deliverables across weeks based on dueDate (or createdAt as fallback)
  const weeklyData: WeeklyData[] = weeks.map((week, index) => {
    // Filter deliverables by dueDate (if available) or createdAt
    const weekDeliverables = data.deliverables.filter(d => {
      // Use dueDate if available, otherwise createdAt
      const dateToUse = d.dueDate ? new Date(d.dueDate) : new Date(d.createdAt);
      return dateToUse >= week.start && dateToUse <= week.end;
    });

    const weekProjects = data.projects.filter(p => {
      // Use dueDate if available, otherwise createdAt
      const dateToUse = p.dueDate ? new Date(p.dueDate) : new Date(p.createdAt);
      return dateToUse >= week.start && dateToUse <= week.end;
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

  // Count deliverables by project type (from briefing.projectType)
  const deliverablesByProjectType: Record<string, number> = {};

  // Group deliverables by their project's type
  for (const project of data.projects) {
    const projectType = project.briefing?.projectType || 'other';
    const projectDeliverables = data.deliverables.filter(d => d.projectId === project.id);
    const deliverableCount = projectDeliverables.reduce((sum, d) => sum + (d.count || 0), 0);
    deliverablesByProjectType[projectType] = (deliverablesByProjectType[projectType] || 0) + deliverableCount;
  }

  return {
    totalAssets: data.deliverables.reduce((sum, d) => sum + (d.count || 0), 0),
    totalBonus: data.deliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0),
    totalProjects: data.projects.length,
    completedProjects: data.projects.filter(p => p.status === 'done').length,
    deliverablesByProjectType,
    weeklyData,
  };
}

class MiroClientReportService {
  /**
   * Find Timeline Master frame and existing report frames
   * Returns position info for placing new report
   */
  private async findReportPosition(): Promise<{ x: number; y: number; timelineTop: number }> {
    const miro = getMiroSDK();
    const defaultPosition = { x: -1500, y: 0, timelineTop: 0 };

    try {
      const frames = await miro.board.get({ type: 'frame' });

      // Find Timeline Master frame
      let timelineFrame = frames.find(f =>
        f.title?.includes('TIMELINE MASTER') ||
        f.title?.includes('Timeline Master') ||
        f.title?.includes('MASTER TIMELINE')
      );

      // Strategy 2: Look for "Timeline Master" text and find nearby frame
      if (!timelineFrame) {
        const texts = await miro.board.get({ type: 'text' });
        const timelineText = texts.find(t =>
          t.content?.includes('Timeline Master') ||
          t.content?.includes('MASTER TIMELINE') ||
          t.content?.includes('TIMELINE MASTER')
        );

        if (timelineText) {
          timelineFrame = frames.find(f => {
            if (!f.width || !f.height) return false;
            const frameTop = f.y - f.height / 2;
            const horizontalClose = Math.abs(f.x - timelineText.x) < 500;
            const verticalClose = frameTop > timelineText.y && frameTop < timelineText.y + 200;
            return horizontalClose && verticalClose;
          });
        }
      }

      // Strategy 3: Find frame near origin
      if (!timelineFrame) {
        timelineFrame = frames.find(f => {
          if (!f.width || !f.height) return false;
          return Math.abs(f.x) < 100 && Math.abs(f.y) < 100 && f.width > 1000;
        });
      }

      if (!timelineFrame || !timelineFrame.width || !timelineFrame.height) {
        return defaultPosition;
      }

      // Calculate Timeline Master top edge
      const timelineTop = timelineFrame.y - timelineFrame.height / 2;
      const timelineLeft = timelineFrame.x - timelineFrame.width / 2;

      // Find existing report frames (to the left of timeline)
      const reportFrames = frames.filter(f => {
        if (!f.title?.startsWith('Report -')) return false;
        if (!f.width || !f.height) return false;
        // Report should be to the left of timeline
        return f.x < timelineFrame.x;
      });

      // Calculate X position (to the left of Timeline Master)
      const reportX = timelineLeft - REPORT.FRAME_WIDTH / 2 - 100;

      // If there are existing reports, stack below them
      if (reportFrames.length > 0) {
        // Find the bottom of the lowest report
        let lowestBottom = timelineTop;
        for (const rf of reportFrames) {
          if (rf.height) {
            const bottom = rf.y + rf.height / 2;
            if (bottom > lowestBottom) {
              lowestBottom = bottom;
            }
          }
        }
        // New report starts below existing reports with gap
        return {
          x: reportX,
          y: lowestBottom + 50, // This will be adjusted to be the TOP of the new frame
          timelineTop,
        };
      }

      // First report - align top with Timeline Master top
      return {
        x: reportX,
        y: timelineTop, // This is the TOP edge, will be adjusted for frame center
        timelineTop,
      };
    } catch (err) {
      logger.warn('Could not find Timeline Master frame', err);
      return defaultPosition;
    }
  }

  /**
   * Get report period label based on date range
   */
  private getReportPeriodLabel(startDate: string, endDate: string): string {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startMonth = start.getMonth();
    const endMonth = end.getMonth();
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    // If same month, show "Month Year"
    if (startMonth === endMonth && startYear === endYear) {
      return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // If full year (Jan 1 to Dec 31 of same year), show just "Year"
    if (startMonth === 0 && endMonth === 11 && start.getDate() === 1 && end.getDate() === 31 && startYear === endYear) {
      return startYear.toString();
    }

    // If same year but different months, show "Month - Month Year"
    if (startYear === endYear) {
      const startMonthName = start.toLocaleDateString('en-US', { month: 'short' });
      const endMonthName = end.toLocaleDateString('en-US', { month: 'short' });
      return `${startMonthName} - ${endMonthName} ${startYear}`;
    }

    // Different years, show "Month Year - Month Year"
    const startLabel = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endLabel = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    return `${startLabel} - ${endLabel}`;
  }

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

    // Calculate dynamic height based on actual content
    const tableWeekCount = Math.min(metrics.weeklyData.length, 12);
    const tableHeight = 30 + (tableWeekCount + 2) * 35;
    const projectTypeCount = Math.min(Object.keys(metrics.deliverablesByProjectType).length, 6);
    const projectTypeHeight = projectTypeCount > 0 ? 35 + projectTypeCount * 38 : 100;

    // Calculate total height: header + cards + chart + table + project type + satisfaction + padding
    const totalContentHeight =
      REPORT.PADDING +                    // Top padding
      REPORT.HEADER_HEIGHT +              // Header
      REPORT.SECTION_GAP +
      REPORT.CARD_HEIGHT + 20 +           // Summary cards
      REPORT.SECTION_GAP +
      300 +                               // Weekly Performance chart
      REPORT.SECTION_GAP +
      tableHeight +                       // Weekly Breakdown table
      REPORT.SECTION_GAP +
      projectTypeHeight +                 // Project Type Breakdown
      REPORT.SECTION_GAP +
      140 +                               // Satisfaction faces
      REPORT.PADDING;                     // Bottom padding

    const dynamicHeight = totalContentHeight;

    // Find position: use provided position, or calculate based on Timeline Master
    let frameX: number;
    let frameTopY: number;

    if (position) {
      frameX = position.x;
      frameTopY = position.y;
    } else {
      const positionInfo = await this.findReportPosition();
      frameX = positionInfo.x;
      frameTopY = positionInfo.y;
    }

    // Frame Y is the CENTER, so adjust from top edge
    const frameY = frameTopY + dynamicHeight / 2;

    // Create report title based on date range
    const reportPeriod = this.getReportPeriodLabel(data.startDate, data.endDate);
    const reportTitle = `Report - ${reportPeriod}`;

    // Create main report frame
    const reportFrame = await miro.board.createFrame({
      title: reportTitle,
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

    // === 1. WEEKLY PERFORMANCE BAR CHART ===
    await this.createWeeklyBarChart(metrics.weeklyData, frameLeft + REPORT.PADDING, currentY, REPORT.FRAME_WIDTH - REPORT.PADDING * 2);
    currentY += 300 + REPORT.SECTION_GAP;

    // === 2. WEEKLY BREAKDOWN TABLE ===
    await this.createWeeklyBreakdownTable(metrics.weeklyData, frameLeft + REPORT.PADDING, currentY, REPORT.FRAME_WIDTH - REPORT.PADDING * 2);
    currentY += tableHeight + REPORT.SECTION_GAP;

    // === 3. PROJECT TYPE BREAKDOWN ===
    await this.createProjectTypeBreakdown(metrics.deliverablesByProjectType, frameX, currentY);
    currentY += projectTypeHeight + REPORT.SECTION_GAP;

    // === 4. CLIENT SATISFACTION (Interactive faces for client to choose) ===
    await this.createSatisfactionFaces(frameX, currentY);

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
      content: `<p><b>CLIENT REPORT</b></p>`,
      x: centerX,
      y: topY + 25,
      width: contentWidth,
      height: 50,
      style: {
        fillColor: CHART_COLORS.primary,
        color: '#FFFFFF',
        fontSize: 22,
        textAlign: 'center',
        textAlignVertical: 'middle',
      },
    });

    // Subtitle with date range
    const dateRange = `${formatDateShort(data.startDate)} - ${formatDateShort(data.endDate)}`;
    await miro.board.createText({
      content: `<b>${data.clientName}</b> | ${dateRange} | Generated by ${data.generatedBy}`,
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
  private async createSummaryCards(metrics: ClientReportMetrics, centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();

    const cards = [
      { label: 'TOTAL ASSETS', value: metrics.totalAssets.toString(), color: CHART_COLORS.assets },
      { label: 'BONUS ITEMS', value: metrics.totalBonus.toString(), color: CHART_COLORS.bonus },
      { label: 'PROJECTS', value: metrics.totalProjects.toString(), color: CHART_COLORS.accent },
      { label: 'COMPLETED', value: metrics.completedProjects.toString(), color: CHART_COLORS.approved },
    ];

    const cardWidth = 250;
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

      // Value
      await miro.board.createText({
        content: `<b>${card.value}</b>`,
        x: cardX,
        y: cardY - 8,
        width: cardWidth - 20,
        style: {
          fontSize: 32,
          textAlign: 'center',
          color: card.color,
        },
      });

      // Label
      await miro.board.createText({
        content: card.label,
        x: cardX,
        y: cardY + 25,
        width: cardWidth - 20,
        style: {
          fontSize: 11,
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
      content: '<b>WEEKLY PERFORMANCE</b>',
      x: startX + width / 2,
      y: topY,
      width: width,
      style: {
        fontSize: 14,
        textAlign: 'left',
        color: '#000000',
      },
    });

    const chartTop = topY + 40;
    const chartHeight = 200;
    const chartWidth = width - 100;
    const barAreaWidth = chartWidth - 60;

    // Filter to only show weeks that have data (assets > 0 or bonus > 0)
    const weeksWithData = weeklyData.filter(w => w.assets > 0 || w.bonus > 0);

    // If no weeks have data, show message
    if (weeksWithData.length === 0) {
      await miro.board.createText({
        content: 'No deliverables in the selected date range',
        x: startX + width / 2,
        y: chartTop + chartHeight / 2,
        width: width - 100,
        style: {
          fontSize: 14,
          textAlign: 'center',
          color: '#9CA3AF',
        },
      });
      return;
    }

    // Show up to 8 weeks with data
    const displayWeeks = weeksWithData.slice(0, 8);

    // Find max value for scaling
    const maxValue = Math.max(
      ...displayWeeks.map(w => Math.max(w.assets, w.bonus)),
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

      // Grid line (Miro SDK requires minimum height of 8)
      await miro.board.createShape({
        shape: 'rectangle',
        content: '',
        x: startX + 60 + barAreaWidth / 2,
        y: yPos + 30,
        width: barAreaWidth,
        height: 8,
        style: {
          fillColor: '#E5E7EB',
          borderWidth: 0,
        },
      });
    }

    // Bars for each week with data
    const maxWeeksToShow = displayWeeks.length;
    const barGroupWidth = barAreaWidth / Math.max(maxWeeksToShow, 1);
    const singleBarWidth = Math.min((barGroupWidth - 20) / 2, 40);

    for (let i = 0; i < maxWeeksToShow; i++) {
      const week = displayWeeks[i];
      if (!week) continue;

      const groupX = startX + 60 + i * barGroupWidth + barGroupWidth / 2;
      const baseY = chartTop + chartHeight + 30;

      // Assets bar
      const assetsHeight = maxValue > 0 ? (week.assets / maxValue) * chartHeight : 0;
      // Miro SDK requires minimum height of 8 for shapes
      if (assetsHeight >= 8) {
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
      // Miro SDK requires minimum height of 8 for shapes
      if (bonusHeight >= 8) {
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
   * Create project type breakdown visualization
   * Shows which project types have the most deliverables/assets
   */
  private async createProjectTypeBreakdown(byProjectType: Record<string, number>, centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Section title
    await miro.board.createText({
      content: '<b>PROJECT TYPE BREAKDOWN</b>',
      x: centerX,
      y: topY,
      width: contentWidth,
      style: {
        fontSize: 14,
        textAlign: 'left',
        color: '#000000',
      },
    });

    const chartTop = topY + 35;

    // Project type labels for display (no emojis)
    const PROJECT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
      'social-post-design': { label: 'Social Post Design', color: '#3B82F6' },
      'email-design': { label: 'Email Design', color: '#8B5CF6' },
      'hero-section': { label: 'Hero Section', color: '#EC4899' },
      'ad-design': { label: 'Ad Design', color: '#F59E0B' },
      'marketing-campaign': { label: 'Marketing Campaign', color: '#10B981' },
      'video-production': { label: 'Video Production', color: '#EF4444' },
      'gif-design': { label: 'GIF Design', color: '#6366F1' },
      'website-assets': { label: 'Website Assets', color: '#14B8A6' },
      'website-ui-design': { label: 'Website UI Design', color: '#F97316' },
      'other': { label: 'Other', color: '#6B7280' },
    };

    // Sort project types by count (descending)
    const sortedTypes = Object.entries(byProjectType)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6); // Show top 6

    const total = Object.values(byProjectType).reduce((a, b) => a + b, 0);
    const maxWidth = contentWidth - 40; // Use most of available width
    const barHeight = 32;
    const barGap = 6;

    // Left edge for bars (aligned to left)
    const barLeftX = centerX - contentWidth / 2 + 20;

    // Find max value for scaling
    const maxCount = sortedTypes.length > 0 ? Math.max(...sortedTypes.map(([, count]) => count)) : 1;

    for (let i = 0; i < sortedTypes.length; i++) {
      const [typeKey, count] = sortedTypes[i]!;
      const typeInfo = PROJECT_TYPE_LABELS[typeKey] || PROJECT_TYPE_LABELS['other']!;
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      // Calculate bar width based on proportion to max value
      const barWidth = Math.max((count / maxCount) * maxWidth, 150);

      const barY = chartTop + i * (barHeight + barGap);

      // Bar background - aligned to left
      await miro.board.createShape({
        shape: 'round_rectangle',
        content: '',
        x: barLeftX + barWidth / 2,
        y: barY + barHeight / 2,
        width: barWidth,
        height: barHeight,
        style: {
          fillColor: typeInfo.color,
          borderWidth: 0,
        },
      });

      // Label with name, count and percentage - aligned to left inside bar
      await miro.board.createText({
        content: `<b>${typeInfo.label}</b>: ${count} assets (${percentage}%)`,
        x: barLeftX + barWidth / 2,
        y: barY + barHeight / 2,
        width: barWidth - 24,
        style: {
          fontSize: 11,
          textAlign: 'left',
          color: '#FFFFFF',
        },
      });
    }

    // Show "No data" if empty
    if (sortedTypes.length === 0) {
      await miro.board.createText({
        content: 'No project type data available',
        x: centerX,
        y: chartTop + 60,
        width: contentWidth,
        style: {
          fontSize: 12,
          textAlign: 'left',
          color: '#9CA3AF',
        },
      });
    }
  }

  /**
   * Create client satisfaction section with clickable face options
   * Client can select one of 5 faces to indicate satisfaction
   */
  private async createSatisfactionFaces(centerX: number, topY: number): Promise<void> {
    const miro = getMiroSDK();
    const contentWidth = REPORT.FRAME_WIDTH - REPORT.PADDING * 2;

    // Section title
    await miro.board.createText({
      content: '<b>HOW WAS YOUR EXPERIENCE?</b>',
      x: centerX,
      y: topY,
      width: contentWidth,
      style: {
        fontSize: 14,
        textAlign: 'center',
        color: '#000000',
      },
    });

    // Subtitle
    await miro.board.createText({
      content: 'Select a face to share your feedback',
      x: centerX,
      y: topY + 22,
      width: contentWidth,
      style: {
        fontSize: 11,
        textAlign: 'center',
        color: '#6B7280',
      },
    });

    const facesTop = topY + 50;
    const faceSize = 60;
    const faceGap = 20;
    const totalWidth = SATISFACTION_FACES.length * faceSize + (SATISFACTION_FACES.length - 1) * faceGap;
    const startX = centerX - totalWidth / 2 + faceSize / 2;

    // Create face options
    for (let i = 0; i < SATISFACTION_FACES.length; i++) {
      const face = SATISFACTION_FACES[i];
      if (!face) continue;

      const faceX = startX + i * (faceSize + faceGap);
      const faceY = facesTop + faceSize / 2;

      // Face circle background
      await miro.board.createShape({
        shape: 'circle',
        content: '',
        x: faceX,
        y: faceY,
        width: faceSize,
        height: faceSize,
        style: {
          fillColor: face.bgColor,
          borderColor: face.color,
          borderWidth: 2,
        },
      });

      // Face emoji
      await miro.board.createText({
        content: face.face,
        x: faceX,
        y: faceY - 2,
        width: faceSize,
        style: {
          fontSize: 28,
          textAlign: 'center',
        },
      });

      // Label below face
      await miro.board.createText({
        content: face.label,
        x: faceX,
        y: faceY + faceSize / 2 + 12,
        width: faceSize + 20,
        style: {
          fontSize: 9,
          textAlign: 'center',
          color: face.color,
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
      content: '<b>WEEKLY BREAKDOWN</b>',
      x: startX + width / 2,
      y: topY,
      width: width,
      style: {
        fontSize: 14,
        textAlign: 'left',
        color: '#000000',
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
