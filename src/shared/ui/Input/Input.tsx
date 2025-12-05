import { forwardRef, useId } from 'react';
import type { InputProps } from './Input.types';
import styles from './Input.module.css';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftAddon, rightAddon, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    const wrapperClassNames = [
      styles.inputWrapper,
      leftAddon && styles.hasLeftAddon,
      rightAddon && styles.hasRightAddon,
      error && styles.hasError,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={`${styles.container} ${className ?? ''}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={wrapperClassNames}>
          {leftAddon && <span className={styles.leftAddon}>{leftAddon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={styles.input}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightAddon && <span className={styles.rightAddon}>{rightAddon}</span>}
        </div>
        {error && (
          <span id={`${inputId}-error`} className={styles.errorText} role="alert">
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={`${inputId}-helper`} className={styles.helperText}>
            {helperText}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
