import { useId, useRef, useEffect, useState } from 'react';
import type { CheckboxProps } from './Checkbox.types';
import styles from './Checkbox.module.css';

export function Checkbox({
  checked,
  defaultChecked,
  onChange,
  indeterminate = false,
  disabled = false,
  error = false,
  label,
  labelPosition = 'right',
  size = 'md',
  name,
  id,
}: CheckboxProps) {
  const generatedId = useId();
  const checkboxId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle controlled vs uncontrolled
  const [internalChecked, setInternalChecked] = useState(defaultChecked ?? false);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  // Set indeterminate state (can't be set via HTML attribute)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;

    if (!isControlled) {
      setInternalChecked(newChecked);
    }

    onChange?.(newChecked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' && !disabled) {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const containerClassNames = [
    styles.container,
    disabled && styles.disabled,
    labelPosition === 'left' && styles.leftLabel,
  ]
    .filter(Boolean)
    .join(' ');

  const boxClassNames = [
    styles.box,
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

  const checkmarkClassNames = [
    styles.checkmark,
    styles[size],
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label
      className={containerClassNames}
      htmlFor={checkboxId}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.checkboxWrapper}>
        <input
          ref={inputRef}
          id={checkboxId}
          name={name}
          type="checkbox"
          className={styles.input}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={error}
          aria-checked={indeterminate ? 'mixed' : isChecked}
        />
        <div className={boxClassNames}>
          <span className={checkmarkClassNames}>
            {indeterminate ? '−' : '✓'}
          </span>
        </div>
      </div>
      {label && <span className={labelClassNames}>{label}</span>}
    </label>
  );
}
