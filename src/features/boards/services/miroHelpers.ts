/**
 * Miro SDK Helper Functions
 *
 * Common utilities used by MasterTimelineService and ProjectRowService
 */
import type { MiroFrame } from '../context/MiroContext';
import type { ProjectBriefing } from '../domain/board.types';
import type { ProjectStatus } from '@features/projects/domain/project.types';
import { TIMELINE, PROJECT_TYPE_CONFIG } from './constants';
import { createLogger } from '@shared/lib/logger';
import { miroAdapter, getMiroSDK as getSDK } from '@shared/lib/miroAdapter';

// Create namespaced loggers for different services
export const timelineLogger = createLogger('MiroTimeline');
export const projectLogger = createLogger('MiroProject');

/**
 * Prefixed logger for Miro services - uses unified logger
 */
export function log(prefix: string, message: string, data?: unknown): void {
  const logger = prefix === 'MiroTimeline' ? timelineLogger : projectLogger;
  logger.debug(message, data);
}

/**
 * Get Miro SDK instance with safety check
 * @deprecated Use miroAdapter.getSDK() from '@shared/lib/miroAdapter' instead
 */
export function getMiroSDK() {
  return getSDK();
}

/**
 * Check if Miro SDK is available
 */
export function isMiroAvailable(): boolean {
  return miroAdapter.isAvailable();
}

/**
 * Find timeline frame on the board by title or dimensions
 */
export async function findTimelineFrame(): Promise<MiroFrame | null> {
  const miro = getMiroSDK();
  const existingFrames = (await miro.board.get({ type: 'frame' })) as MiroFrame[];

  const timelineFrame = existingFrames.find(
    (f) =>
      f.title?.includes('MASTER TIMELINE') ||
      f.title?.includes('Timeline Master') ||
      (f.width &&
        f.height &&
        Math.abs(f.width - TIMELINE.FRAME_WIDTH) < 10 &&
        Math.abs(f.height - TIMELINE.FRAME_HEIGHT) < 10)
  );

  return timelineFrame || null;
}

/**
 * Safely remove a Miro board item by ID (with error handling)
 */
export async function safeRemove(id: string): Promise<boolean> {
  return miroAdapter.removeItem(id);
}

/**
 * Map project status to timeline status - direct since DB now has 7 statuses
 */
export function getTimelineStatus(project: { status: ProjectStatus }): ProjectStatus {
  return project.status;
}

/**
 * Extract project type from briefing timeline
 */
export function getProjectTypeFromBriefing(
  briefing: ProjectBriefing
): { label: string; color: string; icon: string } | null {
  const timeline = briefing.timeline || '';

  // Try to match project type from timeline string (format: "Website UI Design (45 days) - Target: ...")
  for (const [key, config] of Object.entries(PROJECT_TYPE_CONFIG)) {
    if (
      timeline.toLowerCase().includes(key) ||
      timeline.toLowerCase().includes(config.label.toLowerCase())
    ) {
      return config;
    }
  }

  // Try to match longer label variations
  if (timeline.includes('Website UI Design'))
    return PROJECT_TYPE_CONFIG['website-ui-design'] || null;
  if (timeline.includes('Marketing Campaign'))
    return PROJECT_TYPE_CONFIG['marketing-campaign'] || null;
  if (timeline.includes('Video Production'))
    return PROJECT_TYPE_CONFIG['video-production'] || null;
  if (timeline.includes('Email Design')) return PROJECT_TYPE_CONFIG['email-design'] || null;
  if (timeline.includes('Social Post')) return PROJECT_TYPE_CONFIG['social-post-carousel'] || null;

  return null;
}
