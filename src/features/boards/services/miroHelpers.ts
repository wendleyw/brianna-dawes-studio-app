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
 * The frame can be identified by:
 * 1. Title containing 'MASTER TIMELINE' or 'Timeline Master'
 * 2. Having width close to TIMELINE.FRAME_WIDTH (height may vary as frame expands)
 */
export async function findTimelineFrame(): Promise<MiroFrame | null> {
  const miro = getMiroSDK();
  const existingFrames = (await miro.board.get({ type: 'frame' })) as MiroFrame[];

  // First, try to find by title (most reliable)
  const byTitle = existingFrames.find(
    (f) =>
      f.title?.includes('MASTER TIMELINE') ||
      f.title?.includes('Timeline Master')
  );

  if (byTitle) {
    timelineLogger.debug('Found timeline frame by title', { id: byTitle.id, title: byTitle.title });
    return byTitle;
  }

  // Fallback: find by dimensions (width matches, height >= minimum)
  // Height can be larger if the frame expanded to fit more cards
  const byDimensions = existingFrames.find(
    (f) =>
      f.width &&
      f.height &&
      Math.abs(f.width - TIMELINE.FRAME_WIDTH) < 50 &&
      f.height >= TIMELINE.FRAME_HEIGHT - 50
  );

  if (byDimensions) {
    timelineLogger.debug('Found timeline frame by dimensions', {
      id: byDimensions.id,
      width: byDimensions.width,
      height: byDimensions.height
    });
    return byDimensions;
  }

  timelineLogger.debug('No timeline frame found on board');
  return null;
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
export function getTimelineStatus(project: { status: ProjectStatus; dueDate?: string | null; dueDateApproved?: boolean }): ProjectStatus {
  if (project.status === 'done') return 'done';

  if (project.dueDate && project.dueDateApproved !== false) {
    const due = new Date(project.dueDate);
    if (!Number.isNaN(due.getTime())) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(project.dueDate)) {
        due.setHours(23, 59, 59, 999);
      }
      if (due.getTime() < Date.now()) return 'overdue';
    }
  }

  return project.status;
}

/**
 * Extract project type from project data using hardcoded config.
 * Checks briefing.projectType first, then timeline, then description.
 *
 * @deprecated For React components, use useProjectTypeConfig() hook from @features/projects/hooks
 * which fetches project types from the database. This function is kept for non-React contexts
 * (e.g., Miro SDK services during board sync).
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
