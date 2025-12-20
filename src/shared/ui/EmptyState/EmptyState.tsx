import type { EmptyStateProps } from './EmptyState.types';
import { Button } from '../Button';
import styles from './EmptyState.module.css';

export const EmptyState = ({
  icon,
  illustration,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  className,
}: EmptyStateProps) => {
  const classNames = [
    styles.emptyState,
    styles[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      <div className={styles.content}>
        {/* Icon or Illustration */}
        {illustration ? (
          <div className={styles.illustrationWrapper}>
            <img src={illustration} alt="" className={styles.illustration} />
          </div>
        ) : icon ? (
          <div className={styles.iconWrapper}>{icon}</div>
        ) : null}

        {/* Text Content */}
        <div className={styles.textContent}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>

        {/* Actions */}
        {(action || secondaryAction) && (
          <div className={styles.actions}>
            {action && (
              <Button
                variant={action.variant === 'secondary' ? 'secondary' : 'primary'}
                onClick={action.onClick}
                className={styles.primaryAction}
              >
                {action.icon && <span className={styles.actionIcon}>{action.icon}</span>}
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className={styles.secondaryAction}
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

EmptyState.displayName = 'EmptyState';
