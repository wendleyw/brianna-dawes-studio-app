/**
 * ProjectCardQuickActions - View Details, View Board, Google Drive buttons
 */

import { memo } from 'react';
import {
  EyeIcon,
  BoardIcon,
} from '@shared/ui/Icons';
import { useProjectCard } from './ProjectCardContext';
import styles from './ProjectCard.module.css';

// Google Drive icon uses image (not SVG) for brand consistency
const DriveIconImg = ({ hasLink }: { hasLink?: boolean }) => (
  <img
    src="/googledrive-icon.png"
    alt="Google Drive"
    width="18"
    height="18"
    style={{ opacity: hasLink ? 1 : 0.4 }}
  />
);

interface ProjectCardQuickActionsProps {
  onViewDetails: (e: React.MouseEvent) => void;
  onViewBoard: (e: React.MouseEvent) => void;
  onGoogleDrive: (e: React.MouseEvent) => void;
}

export const ProjectCardQuickActions = memo(function ProjectCardQuickActions({
  onViewDetails,
  onViewBoard,
  onGoogleDrive,
}: ProjectCardQuickActionsProps) {
  const { project, isAdmin } = useProjectCard();

  return (
    <div className={styles.quickActions}>
      <button className={styles.actionBtn} onClick={onViewDetails}>
        <EyeIcon />
        <span>View Details</span>
      </button>
      <button className={styles.actionBtn} onClick={onViewBoard}>
        <BoardIcon />
        <span>View Board</span>
      </button>
      {/* Google Drive - Admin always sees it, clients only if link exists */}
      {(isAdmin || project.googleDriveUrl) && (
        <button
          className={`${styles.actionBtnIcon} ${project.googleDriveUrl ? styles.hasLink : ''}`}
          onClick={onGoogleDrive}
          title={project.googleDriveUrl ? 'Open Google Drive' : 'Add Google Drive link'}
        >
          <DriveIconImg hasLink={!!project.googleDriveUrl} />
        </button>
      )}
    </div>
  );
});
