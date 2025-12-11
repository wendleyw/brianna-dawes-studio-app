/**
 * ProjectCardActions - Admin and Client action buttons
 */

import { memo } from 'react';
import {
  StarIcon,
  CheckIcon,
  EditIcon,
  FileIcon,
  PlusIcon,
  UsersIcon,
  ArchiveIcon,
} from '@shared/ui/Icons';
import { useProjectCard } from './ProjectCardContext';
import styles from './ProjectCard.module.css';

export const ProjectCardActions = memo(function ProjectCardActions() {
  const {
    isAdmin,
    isAssignedClient,
    isInReview,
    isDone,
    openModal,
  } = useProjectCard();

  // Handle button clicks - stop propagation to prevent card click
  const handleClick = (
    e: React.MouseEvent,
    modal: 'review' | 'complete' | 'edit' | 'deliverable' | 'version' | 'assign' | 'archive' | 'clientRequestChanges' | 'clientApprove' | 'clientCritical'
  ) => {
    e.stopPropagation();
    openModal(modal);
  };

  if (!isAdmin && !isAssignedClient) {
    return null;
  }

  return (
    <>
      {/* Admin Actions */}
      {isAdmin && (
        <div className={styles.adminActions}>
          <h4 className={styles.actionsTitle}>ACTIONS</h4>
          <div className={styles.actionsGrid}>
            {/* 1. Review */}
            <button className={styles.adminBtn} onClick={(e) => handleClick(e, 'review')}>
              <div className={styles.adminBtnIcon}><StarIcon /></div>
              <span>Review</span>
            </button>

            {/* 2. Complete */}
            <button className={`${styles.adminBtn} ${styles.success}`} onClick={(e) => handleClick(e, 'complete')}>
              <div className={styles.adminBtnIcon}><CheckIcon /></div>
              <span>Complete</span>
            </button>

            {/* 3. Edit */}
            <button className={`${styles.adminBtn} ${styles.primary}`} onClick={(e) => handleClick(e, 'edit')}>
              <div className={styles.adminBtnIcon}><EditIcon /></div>
              <span>Edit</span>
            </button>

            {/* 4. Deliverable */}
            <button className={styles.adminBtn} onClick={(e) => handleClick(e, 'deliverable')}>
              <div className={styles.adminBtnIcon}><FileIcon /></div>
              <span>Deliverable</span>
            </button>

            {/* 5. Version */}
            <button className={styles.adminBtn} onClick={(e) => handleClick(e, 'version')}>
              <div className={styles.adminBtnIcon}><PlusIcon /></div>
              <span>Version</span>
            </button>

            {/* 6. Assign */}
            <button className={styles.adminBtn} onClick={(e) => handleClick(e, 'assign')}>
              <div className={styles.adminBtnIcon}><UsersIcon /></div>
              <span>Assign</span>
            </button>

            {/* 7. Archive */}
            <button className={`${styles.adminBtn} ${styles.danger}`} onClick={(e) => handleClick(e, 'archive')}>
              <div className={styles.adminBtnIcon}><ArchiveIcon /></div>
              <span>Archive</span>
            </button>
          </div>
        </div>
      )}

      {/* Client Actions - Only visible for the ASSIGNED client */}
      {isAssignedClient && (
        <div className={styles.adminActions}>
          <h4 className={styles.actionsTitle}>YOUR ACTIONS</h4>
          <div className={styles.actionsGrid}>
            {/* Version - available for assigned client, hidden when Done */}
            {!isDone && (
              <button className={styles.adminBtn} onClick={(e) => handleClick(e, 'version')}>
                <div className={styles.adminBtnIcon}><PlusIcon /></div>
                <span>Version</span>
              </button>
            )}

            {/* Urgent - available for assigned client, hidden when Done */}
            {!isDone && (
              <button className={`${styles.adminBtn} ${styles.danger}`} onClick={(e) => handleClick(e, 'clientCritical')}>
                <div className={styles.adminBtnIcon}><StarIcon /></div>
                <span>Urgent</span>
              </button>
            )}

            {/* Request Changes - ONLY when in REVIEW status (sends back to in_progress) */}
            {isInReview && (
              <button className={`${styles.adminBtn} ${styles.warning}`} onClick={(e) => handleClick(e, 'clientRequestChanges')}>
                <div className={styles.adminBtnIcon}><EditIcon /></div>
                <span>Request Changes</span>
              </button>
            )}

            {/* Approve - ONLY when in REVIEW status (marks as approved for admin to finalize) */}
            {isInReview && (
              <button className={`${styles.adminBtn} ${styles.success}`} onClick={(e) => handleClick(e, 'clientApprove')}>
                <div className={styles.adminBtnIcon}><CheckIcon /></div>
                <span>Approve</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
});
