import { Badge } from '@shared/ui';
import type { DeliverableCardProps } from './DeliverableCard.types';
import styles from './DeliverableCard.module.css';

const STATUS_MAP = {
  draft: { label: 'Draft', variant: 'neutral' as const },
  in_progress: { label: 'In Progress', variant: 'info' as const },
  in_review: { label: 'In Review', variant: 'warning' as const },
  approved: { label: 'Approved', variant: 'success' as const },
  rejected: { label: 'Rejected', variant: 'error' as const },
  delivered: { label: 'Delivered', variant: 'info' as const },
};

const TYPE_ICONS: Record<string, React.ReactElement> = {
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  video: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  document: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  other: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
};

export function DeliverableCard({ deliverable, onView }: DeliverableCardProps) {
  const status = STATUS_MAP[deliverable.status];
  const isOverdue = deliverable.dueDate && new Date(deliverable.dueDate) < new Date() && deliverable.status !== 'delivered';

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <article className={styles.card} onClick={() => onView?.(deliverable)}>
      <div className={styles.preview}>
        {deliverable.thumbnailUrl ? (
          <img
            src={deliverable.thumbnailUrl}
            alt={deliverable.name}
            className={styles.previewImage}
          />
        ) : (
          <div className={styles.previewPlaceholder}>
            <span className={styles.typeIcon}>{TYPE_ICONS[deliverable.type]}</span>
          </div>
        )}
        <div className={styles.badge}>
          <Badge variant={status.variant} size="sm">{status.label}</Badge>
        </div>
        {deliverable.versionsCount > 0 && (
          <span className={styles.version}>v{deliverable.versionsCount}</span>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{deliverable.name}</h3>
        {deliverable.description && (
          <p className={styles.description}>{deliverable.description}</p>
        )}

        <div className={styles.meta}>
          {deliverable.dueDate && (
            <div className={`${styles.date} ${isOverdue ? styles.dateOverdue : ''}`}>
              <svg className={styles.dateIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>{formatDate(deliverable.dueDate)}</span>
            </div>
          )}

          {deliverable.feedbackCount > 0 && (
            <div className={styles.feedback}>
              <svg className={styles.feedbackIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>{deliverable.feedbackCount}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
