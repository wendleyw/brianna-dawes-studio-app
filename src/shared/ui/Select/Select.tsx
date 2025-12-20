import { useState, useRef, useEffect, useId, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import type { SelectProps, SelectOption } from './Select.types';
import styles from './Select.module.css';

export function Select<T = string>({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  multiple = false,
  searchable = false,
  disabled = false,
  loading = false,
  error,
  renderOption,
  size = 'md',
  name,
  id,
  label,
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculate dropdown position
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options;

  // Get selected options
  const getSelectedOptions = (): SelectOption<T>[] => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return options.filter(opt => value.includes(opt.value));
    }
    const selected = options.find(opt => opt.value === value);
    return selected ? [selected] : [];
  };

  const selectedOptions = getSelectedOptions();

  // Handle option selection
  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;

    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(option.value)
        ? currentValues.filter(v => v !== option.value)
        : [...currentValues, option.value];
      onChange(newValues as T | T[]);
    } else {
      onChange(option.value as T | T[]);
      setIsOpen(false);
      setSearchQuery('');
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setActiveIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Tab':
        if (isOpen) {
          setIsOpen(false);
          setSearchQuery('');
        }
        break;
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const activeElement = dropdownRef.current.querySelector(
        `[data-index="${activeIndex}"]`
      );
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const triggerClassNames = [
    styles.trigger,
    styles[size],
    error && styles.hasError,
  ]
    .filter(Boolean)
    .join(' ');

  const renderTriggerContent = () => {
    if (selectedOptions.length === 0) {
      return <span className={styles.placeholder}>{placeholder}</span>;
    }

    if (multiple && selectedOptions.length > 0) {
      return (
        <div className={styles.multipleValues}>
          {selectedOptions.map(option => (
            <span key={String(option.value)} className={styles.valueTag}>
              {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
              {option.label}
            </span>
          ))}
        </div>
      );
    }

    const selected = selectedOptions[0];
    if (!selected) return null;

    return (
      <div className={styles.valueContent}>
        {selected.icon && <span className={styles.optionIcon}>{selected.icon}</span>}
        {selected.label}
      </div>
    );
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <div
        ref={dropdownRef}
        className={styles.dropdown}
        style={dropdownStyle}
        role="listbox"
        aria-label={label || 'Select options'}
        aria-multiselectable={multiple}
      >
        {searchable && (
          <input
            ref={searchInputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search options"
          />
        )}

        {loading ? (
          <div className={styles.loadingSkeleton}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={styles.loadingItem} />
            ))}
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className={styles.emptyState}>No options found</div>
        ) : (
          <ul className={styles.optionsList}>
            {filteredOptions.map((option, index) => {
              const isSelected = multiple
                ? Array.isArray(value) && value.includes(option.value)
                : value === option.value;
              const isActive = index === activeIndex;

              const optionClassNames = [
                styles.option,
                isActive && styles.active,
                isSelected && styles.selected,
                option.disabled && styles.disabled,
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={String(option.value)}
                  className={optionClassNames}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled}
                  data-index={index}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {renderOption ? (
                    renderOption(option)
                  ) : (
                    <>
                      {option.icon && (
                        <span className={styles.optionIcon}>{option.icon}</span>
                      )}
                      <span className={styles.optionLabel}>{option.label}</span>
                      {isSelected && (
                        <span className={styles.checkmark}>✓</span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className={styles.container}>
      {label && (
        <label htmlFor={selectId} className={styles.label}>
          {label}
        </label>
      )}
      <div className={styles.selectWrapper}>
        <button
          ref={triggerRef}
          id={selectId}
          name={name}
          type="button"
          className={triggerClassNames}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : undefined}
        >
          {renderTriggerContent()}
          <span className={`${styles.chevron} ${isOpen ? styles.open : ''}`}>
            ▼
          </span>
        </button>
        {renderDropdown()}
      </div>
      {error && (
        <span id={`${selectId}-error`} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
