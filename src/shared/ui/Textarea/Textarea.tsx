import { useId, useRef, useEffect, useState, useCallback } from 'react';
import type { TextareaProps } from './Textarea.types';
import styles from './Textarea.module.css';

export function Textarea({
  value,
  defaultValue,
  onChange,
  placeholder,
  disabled = false,
  error,
  maxLength,
  showCounter = false,
  autoResize = false,
  rows = 4,
  resize = 'vertical',
  name,
  id,
  label,
  helperText,
}: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle controlled vs uncontrolled
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  // Auto-resize functionality
  const adjustHeight = useCallback(() => {
    if (!autoResize || !textareaRef.current) return;

    // Reset height to auto to get the correct scrollHeight
    textareaRef.current.style.height = 'auto';
    // Set height to scrollHeight
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [autoResize]);

  // Adjust height when value changes or component mounts
  useEffect(() => {
    adjustHeight();
  }, [currentValue, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;

    // Enforce maxLength if set
    if (maxLength && newValue.length > maxLength) {
      return;
    }

    if (!isControlled) {
      setInternalValue(newValue);
    }

    onChange?.(newValue);
  };

  // Calculate character count
  const characterCount = currentValue.length;
  const isAtLimit = maxLength && characterCount === maxLength;
  const isOverLimit = maxLength && characterCount > maxLength;

  const textareaClassNames = [
    styles.textarea,
    error && styles.hasError,
    autoResize && styles.autoResize,
    !autoResize && styles[`resize${resize.charAt(0).toUpperCase()}${resize.slice(1)}`],
  ]
    .filter(Boolean)
    .join(' ');

  const counterClassNames = [
    styles.counter,
    isAtLimit && styles.atLimit,
    isOverLimit && styles.overLimit,
  ]
    .filter(Boolean)
    .join(' ');

  const showFooter = error || helperText || (showCounter && maxLength);

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={textareaId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.textareaWrapper}>
        <textarea
          ref={textareaRef}
          id={textareaId}
          name={name}
          className={textareaClassNames}
          value={currentValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${textareaId}-error`
              : helperText
              ? `${textareaId}-helper`
              : undefined
          }
        />
      </div>
      {showFooter && (
        <div className={styles.footer}>
          {error ? (
            <span id={`${textareaId}-error`} className={styles.errorText} role="alert">
              {error}
            </span>
          ) : helperText ? (
            <span id={`${textareaId}-helper`} className={styles.helperText}>
              {helperText}
            </span>
          ) : (
            <span /> // Empty span for spacing when only counter is shown
          )}
          {showCounter && maxLength && (
            <span className={counterClassNames}>
              {characterCount}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
