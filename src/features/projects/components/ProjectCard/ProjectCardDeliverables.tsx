/**
 * ProjectCardDeliverables - Expandable deliverables list
 */

import { memo } from 'react';
import {
  ExternalLinkIcon,
  BoardIcon,
  EditIcon,
  TrashIcon,
} from '@shared/ui/Icons';
import { useProjectCard } from './ProjectCardContext';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import styles from './ProjectCard.module.css';

interface ProjectCardDeliverablesProps {
  deliverables: Deliverable[];
  onEditDeliverable: (deliverable: Deliverable) => void;
  zoomToMiroItem: (urlOrId: string) => Promise<boolean>;
}

export const ProjectCardDeliverables = memo(function ProjectCardDeliverables({
  deliverables,
  onEditDeliverable,
  zoomToMiroItem,
}: ProjectCardDeliverablesProps) {
  const {
    isAdmin,
    showDeliverables,
    setDeletingDeliverable,
  } = useProjectCard();

  if (!showDeliverables || deliverables.length === 0) {
    return null;
  }

  return (
    <div className={styles.deliverablesExpanded}>
      {deliverables.map((d) => (
        <div key={d.id} className={styles.deliverableItem}>
          <div className={styles.deliverableHeader}>
            <span className={styles.deliverableName}>{d.name}</span>
            {d.type && d.type !== 'other' && (
              <span className={styles.deliverableType}>{d.type}</span>
            )}
          </div>
          <div className={styles.deliverableDetails}>
            <span className={styles.deliverableDetail}>
              {d.count}x{d.bonusCount > 0 && <span className={styles.bonusSmall}> +{d.bonusCount}</span>}
            </span>
          </div>
          <div className={styles.deliverableActions}>
            {d.externalUrl && (
              <button
                className={styles.deliverableLink}
                onClick={(e) => { e.stopPropagation(); window.open(d.externalUrl!, '_blank'); }}
                title="Link"
              >
                <ExternalLinkIcon />
              </button>
            )}
            {d.miroUrl && (
              <button
                className={styles.deliverableLink}
                onClick={async (e) => {
                  e.stopPropagation();
                  const zoomed = await zoomToMiroItem(d.miroUrl!);
                  if (!zoomed) {
                    window.open(d.miroUrl!, '_blank');
                  }
                }}
                title="View on Board"
              >
                <BoardIcon />
              </button>
            )}
            {isAdmin && (
              <>
                <button
                  className={styles.deliverableEdit}
                  onClick={(e) => { e.stopPropagation(); onEditDeliverable(d); }}
                  title="Edit"
                >
                  <EditIcon size={12} />
                </button>
                <button
                  className={styles.deliverableDelete}
                  onClick={(e) => { e.stopPropagation(); setDeletingDeliverable(d); }}
                  title="Delete"
                >
                  <TrashIcon size={12} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
});
