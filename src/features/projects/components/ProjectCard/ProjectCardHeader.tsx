/**
 * ProjectCardHeader - Status badges and banners
 */

import { memo } from 'react';
import { Badge } from '@shared/ui';
import { getStatusColumn } from '@shared/lib/timelineStatus';
import { PRIORITY_CONFIG, BADGE_COLORS } from '@features/boards/services/constants/colors.constants';
import { useProjectTypeConfig } from '../../hooks';
import { useProjectCard } from './ProjectCardContext';
import styles from './ProjectCard.module.css';

export const ProjectCardHeader = memo(function ProjectCardHeader() {
  const { project, isClient, isInReview, isDone, isArchived } = useProjectCard();
  const { getProjectType } = useProjectTypeConfig();

  const statusColumn = getStatusColumn(project.status);
  const priority = PRIORITY_CONFIG[project.priority];
  const projectType = getProjectType(project);

  return (
    <div className={styles.header}>
      {/* Review Ready banner - shown to client when project is in review status (hide if already approved) */}
      {isInReview && isClient && !project.wasApproved && (
        <div className={styles.reviewReadyBanner}>
          <span className={styles.reviewReadyText}>★ REVIEW READY</span>
        </div>
      )}

      {/* Approved banner - shown when client has approved (ready for admin to finalize) */}
      {project.wasApproved && !isDone && (
        <div className={styles.approvedBanner}>
          <Badge
            color="neutral"
            size="sm"
            style={{
              backgroundColor: BADGE_COLORS.SUCCESS,
              color: 'var(--color-text-inverse)',
              border: 'none',
              fontWeight: 700,
              letterSpacing: '0.5px',
              padding: '4px 12px',
            }}
          >
            ✓ CLIENT APPROVED
          </Badge>
        </div>
      )}

      {/* Reviewed badge - shown when client requested changes (hidden when done, in review, or approved) */}
      {project.wasReviewed && !isDone && !isInReview && !project.wasApproved && (
        <div className={styles.reviewedBanner}>
          <Badge
            color="neutral"
            size="sm"
            style={{
              backgroundColor: BADGE_COLORS.PURPLE,
              color: 'var(--color-text-inverse)',
              border: 'none',
              fontWeight: 700,
              letterSpacing: '0.5px',
              padding: '4px 12px',
            }}
          >
            ✎ CHANGES REQUESTED
          </Badge>
        </div>
      )}

      {/* Archived banner - shown when project is archived */}
      {isArchived && (
        <div className={styles.archivedBanner}>
          <Badge
            color="neutral"
            size="sm"
            style={{
              backgroundColor: BADGE_COLORS.NEUTRAL,
              color: 'var(--color-text-inverse)',
              border: 'none',
              fontWeight: 700,
              letterSpacing: '0.5px',
              padding: '4px 12px',
            }}
          >
            📦 ARCHIVED
          </Badge>
        </div>
      )}

      {/* Badges row: Priority | Type | Status */}
      <div className={styles.badges}>
        {/* 1. Priority badge */}
        {priority && (
          <Badge
            color="neutral"
            size="sm"
            style={{ backgroundColor: priority.color, color: 'var(--color-text-inverse)', border: 'none' }}
          >
            {priority.label}
          </Badge>
        )}

        {/* 2. Project Type badge */}
        {projectType && (
          <Badge
            color="neutral"
            size="sm"
            style={{ backgroundColor: projectType.color, color: 'var(--color-text-inverse)', border: 'none' }}
          >
            {projectType.label.toUpperCase()}
          </Badge>
        )}

        {/* 3. Status badge - uses exact color from timeline config, or ARCHIVED if archived */}
        <Badge
          size="sm"
          style={{
            backgroundColor: isArchived ? BADGE_COLORS.NEUTRAL : statusColumn.color,
            color: 'var(--color-text-inverse)',
            border: 'none'
          }}
        >
          {isArchived ? 'ARCHIVED' : statusColumn.label}
        </Badge>
      </div>
    </div>
  );
});
