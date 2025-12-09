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
 * Extract project type from project data
 * Checks briefing.projectType first, then timeline, then description
 */
export function getProjectType(
  project: { briefing?: { timeline?: string | null; projectType?: string | null } | null; description?: string | null }
): { label: string; color: string; icon: string } | null {
  // Check briefing.projectType first (most reliable source)
  if (project.briefing?.projectType) {
    const config = PROJECT_TYPE_CONFIG[project.briefing.projectType];
    if (config) return config;
  }

  // Try to extract from briefing.timeline and description
  const timeline = project.briefing?.timeline || '';
  const desc = project.description || '';
  const textToSearch = (timeline + ' ' + desc).toLowerCase();

  // Match against PROJECT_TYPE_CONFIG keys and labels
  for (const [key, config] of Object.entries(PROJECT_TYPE_CONFIG)) {
    if (textToSearch.includes(key) || textToSearch.includes(config.label.toLowerCase())) {
      return config;
    }
  }

  // Try to match longer label variations (case-sensitive for exact matches)
  const fullText = timeline + ' ' + desc;
  if (fullText.includes('Social Post Design')) return PROJECT_TYPE_CONFIG['social-post-design'] || null;
  if (fullText.includes('Email Design')) return PROJECT_TYPE_CONFIG['email-design'] || null;
  if (fullText.includes('Hero Section')) return PROJECT_TYPE_CONFIG['hero-section'] || null;
  if (fullText.includes('Ad Design')) return PROJECT_TYPE_CONFIG['ad-design'] || null;
  if (fullText.includes('Marketing Campaign')) return PROJECT_TYPE_CONFIG['marketing-campaign'] || null;
  if (fullText.includes('Video Production')) return PROJECT_TYPE_CONFIG['video-production'] || null;
  if (fullText.includes('GIF Design')) return PROJECT_TYPE_CONFIG['gif-design'] || null;
  if (fullText.includes('Website Assets')) return PROJECT_TYPE_CONFIG['website-assets'] || null;
  if (fullText.includes('Website UI Design')) return PROJECT_TYPE_CONFIG['website-ui-design'] || null;

  return null;
}

/**
 * Extract project type from briefing (backward compatibility wrapper)
 * @deprecated Use getProjectType() instead for more complete detection
 */
export function getProjectTypeFromBriefing(
  briefing: ProjectBriefing
): { label: string; color: string; icon: string } | null {
  return getProjectType({ briefing });
}
