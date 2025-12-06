import { memo } from 'react';
import styles from './MetricCard.module.css';

interface MetricCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

/**
 * MetricCard - Displays a single metric with label and value
 * Memoized to prevent unnecessary re-renders in dashboard grids
 */
export const MetricCard = memo(function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
      {icon && <span className={styles.icon}>{icon}</span>}
    </div>
  );
});
