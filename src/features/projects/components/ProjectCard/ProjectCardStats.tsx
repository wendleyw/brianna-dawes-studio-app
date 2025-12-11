/**
 * ProjectCardStats - Progress bar, deliverables count, days left
 */

import { memo, useMemo } from 'react';
import {
  CalendarIcon,
  PackageIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@shared/ui/Icons';
import { getStatusProgress } from '@shared/lib/timelineStatus';
import { useProjectCard } from './ProjectCardContext';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import styles from './ProjectCard.module.css';

interface ProjectCardStatsProps {
  deliverables: Deliverable[];
  onApproveDueDate?: (e: React.MouseEvent) => void;
  onRejectDueDate?: (e: React.MouseEvent) => void;
}

export const ProjectCardStats = memo(function ProjectCardStats({
  deliverables,
  onApproveDueDate,
  onRejectDueDate,
}: ProjectCardStatsProps) {
  const {
    project,
    isAdmin,
    isDone,
    showDeliverables,
    setShowDeliverables,
  } = useProjectCard();

  // Calculate total assets and bonus assets from deliverables
  const assetTotals = useMemo(() => {
    const totalAssets = deliverables.reduce((sum, d) => sum + (d.count || 0), 0);
    const totalBonus = deliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0);
    return { totalAssets, totalBonus };
  }, [deliverables]);

  // Calculate days left/overdue
  const daysInfo = useMemo(() => {
    if (!project.dueDate) return null;
    // If due date is not approved, show "Em análise"
    if (!project.dueDateApproved) {
      return { text: 'Em análise', isOverdue: false, isPending: true };
    }
    const due = new Date(project.dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `${Math.abs(diff)} days overdue`, isOverdue: true, isPending: false };
    if (diff === 0) return { text: 'Due today', isOverdue: false, isPending: false };
    return { text: `${diff} days left`, isOverdue: false, isPending: false };
  }, [project.dueDate, project.dueDateApproved]);

  // Calculate progress based on project status
  const progress = useMemo(() => getStatusProgress(project.status), [project.status]);

  return (
    <>
      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <span className={styles.progressLabel}>Progress</span>
        <span className={styles.progressValue}>{progress}%</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.statDeliverables}>
          {deliverables.length > 0 ? (
            <button
              className={styles.statClickable}
              onClick={(e) => { e.stopPropagation(); setShowDeliverables(!showDeliverables); }}
            >
              <PackageIcon />
              <span className={styles.statValue}>{deliverables.length}</span>
              <span className={styles.statLabel}>DELIVERABLES</span>
              <ChevronDownIcon isOpen={showDeliverables} />
            </button>
          ) : (
            <div className={styles.stat}>
              <PackageIcon />
              <span className={styles.statValue}>{project.deliverablesCount || 0}</span>
              <span className={styles.statLabel}>DELIVERABLES</span>
            </div>
          )}
          {assetTotals.totalAssets > 0 && (
            <div className={styles.assetsRow}>
              <span className={styles.assetsCount}>{assetTotals.totalAssets} assets</span>
            </div>
          )}
        </div>
        <div className={`${styles.stat} ${daysInfo?.isOverdue && project.status !== 'done' ? styles.overdue : ''} ${project.status === 'done' ? styles.completed : ''} ${daysInfo?.isPending ? styles.isPending : ''}`}>
          {isDone ? (
            <>
              <CheckIcon />
              <span className={styles.statLabel}>COMPLETED</span>
            </>
          ) : daysInfo?.isPending ? (
            <>
              <CalendarIcon size={14} />
              <div className={styles.pendingDateInfo}>
                <span className={styles.pendingLabel}>PENDING</span>
                <span className={styles.pendingDate}>
                  {project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
              {isAdmin && onApproveDueDate && onRejectDueDate && (
                <div className={styles.dueDateApprovalButtons}>
                  <button
                    className={styles.approveSmall}
                    onClick={onApproveDueDate}
                    title="Approve date"
                  >
                    ✓
                  </button>
                  <button
                    className={styles.rejectSmall}
                    onClick={onRejectDueDate}
                    title="Reject date"
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <CalendarIcon size={14} />
              <span className={styles.statValue}>
                {daysInfo
                  ? (daysInfo.isOverdue
                      ? daysInfo.text.match(/\d+/)?.[0] || '0'
                      : daysInfo.text.match(/\d+/)?.[0] || '—')
                  : '—'}
              </span>
              <span className={styles.statLabel}>{daysInfo?.isOverdue ? 'OVERDUE' : 'DAYS LEFT'}</span>
            </>
          )}
        </div>
      </div>
    </>
  );
});
