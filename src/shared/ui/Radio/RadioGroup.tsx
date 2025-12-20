import { useState, useId, KeyboardEvent } from 'react';
import { Radio } from './Radio';
import type { RadioGroupProps } from './Radio.types';
import styles from './Radio.module.css';

export function RadioGroup<T = string>({
  value,
  defaultValue,
  onChange,
  options,
  name,
  orientation = 'vertical',
  disabled = false,
  error,
  label,
  size = 'md',
}: RadioGroupProps<T>) {
  const generatedId = useId();
  const groupId = `radio-group-${generatedId}`;

  // Handle controlled vs uncontrolled
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleChange = (optionValue: T) => {
    if (!isControlled) {
      setInternalValue(optionValue);
    }
    onChange(optionValue);
  };

  const handleKeyDown = (e: KeyboardEvent, currentIndex: number) => {
    if (disabled) return;

    let newIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (currentIndex + 1) % options.length;
        // Skip disabled options
        while (options[newIndex]?.disabled && newIndex !== currentIndex) {
          newIndex = (newIndex + 1) % options.length;
        }
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = currentIndex - 1 < 0 ? options.length - 1 : currentIndex - 1;
        // Skip disabled options
        while (options[newIndex]?.disabled && newIndex !== currentIndex) {
          newIndex = newIndex - 1 < 0 ? options.length - 1 : newIndex - 1;
        }
        break;
      default:
        return;
    }

    const newOption = options[newIndex];
    if (newIndex !== currentIndex && newOption && !newOption.disabled) {
      handleChange(newOption.value);
      // Focus the new radio button
      const radioElement = document.getElementById(`${groupId}-${newIndex}`);
      radioElement?.focus();
    }
  };

  const groupClassNames = [
    styles.radioGroup,
    styles[orientation],
    disabled && styles.disabled,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.radioGroupContainer}>
      {label && (
        <div
          className={styles.radioGroupLabel}
          id={`${groupId}-label`}
        >
          {label}
        </div>
      )}
      <div
        className={groupClassNames}
        role="radiogroup"
        aria-labelledby={label ? `${groupId}-label` : undefined}
        aria-required="false"
        aria-invalid={!!error}
        aria-describedby={error ? `${groupId}-error` : undefined}
      >
        {options.map((option, index) => {
          const isChecked = currentValue === option.value;
          const isDisabled = disabled || option.disabled;

          return (
            <div
              key={String(option.value)}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              <Radio
                id={`${groupId}-${index}`}
                name={name}
                value={String(option.value)}
                checked={isChecked}
                onChange={() => handleChange(option.value)}
                disabled={isDisabled || false}
                error={!!error}
                label={option.label}
                size={size}
              />
            </div>
          );
        })}
      </div>
      {error && (
        <span id={`${groupId}-error`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
