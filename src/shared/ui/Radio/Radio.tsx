import { useId } from 'react';
import type { RadioProps } from './Radio.types';
import styles from './Radio.module.css';

export function Radio({
  checked,
  onChange,
  disabled = false,
  error = false,
  label,
  value,
  name,
  size = 'md',
  id,
}: RadioProps) {
  const generatedId = useId();
  const radioId = id ?? generatedId;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && !disabled) {
      e.preventDefault();
      const input = document.getElementById(radioId) as HTMLInputElement;
      input?.click();
    }
  };

  const containerClassNames = [
    styles.container,
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ');

  const circleClassNames = [
    styles.circle,
    styles[size],
    error && styles.error,
  ]
    .filter(Boolean)
    .join(' ');

  const labelClassNames = [
    styles.label,
    styles[size],
  ]
    .filter(Boolean)
    .join(' ');

  const dotClassNames = [
    styles.dot,
    styles[size],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label
      className={containerClassNames}
      htmlFor={radioId}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.radioWrapper}>
        <input
          id={radioId}
          name={name}
          type="radio"
          className={styles.input}
          value={value}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={error}
        />
        <div className={circleClassNames}>
          <div className={dotClassNames} />
        </div>
      </div>
      {label && <span className={labelClassNames}>{label}</span>}
    </label>
  );
}
