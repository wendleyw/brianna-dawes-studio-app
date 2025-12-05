import { Skeleton } from '@shared/ui';
import { useDeliverableVersions } from '../../hooks/useDeliverableVersions';
import type { VersionHistoryProps } from './VersionHistory.types';
import type { DeliverableVersion } from '../../domain/deliverable.types';
import styles from './VersionHistory.module.css';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VersionHistory({
  deliverableId,
  currentVersionId,
  onVersionSelect,
}: VersionHistoryProps) {
  const { data: versions, isLoading } = useDeliverableVersions(deliverableId);

  const handleDownload = (version: DeliverableVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(version.fileUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Version History</h3>
        <div className={styles.loading}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (!versions || versions.length === 0) {
    return (
      <div className={styles.container}>
        <h3 className={styles.title}>Version History</h3>
        <div className={styles.empty}>No versions available</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Version History ({versions.length})</h3>
      <div className={styles.list}>
        {versions.map((version) => {
          const isCurrent = version.id === currentVersionId;

          return (
            <div
              key={version.id}
              className={`${styles.item} ${isCurrent ? styles.itemCurrent : ''}`}
              onClick={() => onVersionSelect?.(version)}
            >
              <span
                className={`${styles.versionNumber} ${isCurrent ? styles.itemCurrentNumber : ''}`}
              >
                {version.versionNumber}
              </span>

              <div className={styles.content}>
                <div className={styles.header}>
                  <span className={styles.fileName}>{version.fileName}</span>
                  {isCurrent && <span className={styles.currentBadge}>Current</span>}
                </div>

                <div className={styles.meta}>
                  <div className={styles.uploader}>
                    {version.uploadedBy.avatarUrl ? (
                      <img
                        src={version.uploadedBy.avatarUrl}
                        alt={version.uploadedBy.name}
                        className={styles.uploaderAvatar}
                      />
                    ) : (
                      <div className={styles.uploaderAvatar} />
                    )}
                    <span>{version.uploadedBy.name}</span>
                  </div>
                  <span>{formatDate(version.createdAt)}</span>
                  <span className={styles.fileSize}>{formatFileSize(version.fileSize)}</span>
                </div>

                {version.comment && (
                  <div className={styles.comment}>"{version.comment}"</div>
                )}
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.actionButton}
                  onClick={(e) => handleDownload(version, e)}
                  title="Download"
                >
                  <svg className={styles.actionIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
