import type { SpinnerProps } from './Spinner.types';
import styles from './Spinner.module.css';

export const Spinner = ({
  size = 'md',
  variant = 'border',
  color = 'primary',
  label = 'Loading...',
  className,
}: SpinnerProps) => {
  const classNames = [
    styles.spinner,
    styles[`size-${size}`],
    styles[`variant-${variant}`],
    styles[`color-${color}`],
    className,
  ].filter(Boolean).join(' ');

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={classNames}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
        );
      case 'bars':
        return (
          <div className={classNames}>
            <span className={styles.bar} />
            <span className={styles.bar} />
            <span className={styles.bar} />
          </div>
        );
      case 'border':
      default:
        return <div className={classNames} />;
    }
  };

  return (
    <div className={styles.spinnerWrapper} role="status" aria-label={label}>
      {renderSpinner()}
      <span className={styles.srOnly}>{label}</span>
    </div>
  );
};

Spinner.displayName = 'Spinner';
