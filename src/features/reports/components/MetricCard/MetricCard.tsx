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

export function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
      </div>
      {icon && <span className={styles.icon}>{icon}</span>}
    </div>
  );
}
