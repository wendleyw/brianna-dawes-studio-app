import { useEffect, useState } from 'react';
import styles from './CreditBar.module.css';

export interface CreditBarProps {
  /** Current usage count */
  used: number;
  /** Total limit */
  limit: number;
  /** Plan name to display */
  planName?: string | undefined;
  /** Plan color for the progress bar */
  planColor?: string | undefined;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show labels */
  showLabels?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** Custom class name */
  className?: string;
}

export function CreditBar({
  used,
  limit,
  planName,
  planColor = '#2563EB',
  size = 'md',
  showLabels = true,
  animate = true,
  className = '',
}: CreditBarProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(animate ? 0 : (used / limit) * 100);
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isOverLimit = used > limit;
  const isNearLimit = percentage >= 80;

  useEffect(() => {
    if (animate) {
      const timer = setTimeout(() => {
        setAnimatedPercentage(percentage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [percentage, animate]);

  // Determine color based on usage
  const getBarColor = () => {
    if (isOverLimit) return '#EF4444'; // Red for over limit
    if (isNearLimit) return '#F59E0B'; // Warning yellow
    return planColor;
  };

  return (
    <div className={`${styles.container} ${styles[size]} ${className}`}>
      {showLabels && (
        <div className={styles.header}>
          <div className={styles.planInfo}>
            {planName && (
              <span className={styles.planBadge} style={{ backgroundColor: planColor }}>
                {planName}
              </span>
            )}
          </div>
          <span className={styles.usage} style={{ color: isOverLimit ? '#EF4444' : undefined }}>
            <strong>{used}</strong> / {limit}
          </span>
        </div>
      )}

      <div className={styles.barContainer}>
        <div
          className={`${styles.bar} ${animate ? styles.animated : ''}`}
          style={{
            width: `${animatedPercentage}%`,
            backgroundColor: getBarColor(),
          }}
        >
          {size !== 'sm' && percentage > 15 && (
            <span className={styles.barLabel}>{Math.round(percentage)}%</span>
          )}
        </div>
        {/* Pulse animation for near limit */}
        {isNearLimit && !isOverLimit && (
          <div
            className={styles.pulse}
            style={{ left: `${Math.min(animatedPercentage, 100)}%`, backgroundColor: getBarColor() }}
          />
        )}
      </div>

      {!showLabels && (
        <div className={styles.miniStats}>
          <span>{Math.round(percentage)}%</span>
          <span>{used}/{limit}</span>
        </div>
      )}
    </div>
  );
}
