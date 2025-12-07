import { Input, Button } from '@shared/ui';
import { useDebounce } from '@shared/hooks/useDebounce';
import type { ProjectFiltersProps } from './ProjectFilters.types';
import type { ProjectStatus, ProjectPriority, ProjectSort } from '../../domain/project.types';
import styles from './ProjectFilters.module.css';
import { useState, useEffect, useRef } from 'react';

const STATUS_OPTIONS: { value: ProjectStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];

const PRIORITY_OPTIONS: { value: ProjectPriority | ''; label: string }[] = [
  { value: '', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Standard' },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'createdAt:desc', label: 'Newest first' },
  { value: 'createdAt:asc', label: 'Oldest first' },
  { value: 'name:asc', label: 'Name (A-Z)' },
  { value: 'name:desc', label: 'Name (Z-A)' },
  { value: 'dueDate:asc', label: 'Due date (soon)' },
  { value: 'dueDate:desc', label: 'Due date (later)' },
  { value: 'priority:desc', label: 'Priority (high)' },
  { value: 'priority:asc', label: 'Priority (low)' },
];

export function ProjectFilters({
  filters,
  sort,
  onFiltersChange,
  onSortChange,
  onReset,
}: ProjectFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchValue, 300);
  const prevSearchRef = useRef(filters.search);
  const filtersRef = useRef(filters);

  // Keep filtersRef updated
  filtersRef.current = filters;

  useEffect(() => {
    // Only update if debounced search actually changed
    if (debouncedSearch !== prevSearchRef.current) {
      prevSearchRef.current = debouncedSearch;
      const newFilters = { ...filtersRef.current };
      if (debouncedSearch) {
        newFilters.search = debouncedSearch;
      } else {
        delete newFilters.search;
      }
      onFiltersChange(newFilters);
    }
  }, [debouncedSearch, onFiltersChange]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ProjectStatus | '';
    const newFilters = { ...filters };
    if (value) {
      newFilters.status = value;
    } else {
      delete newFilters.status;
    }
    onFiltersChange(newFilters);
  };

  const handlePriorityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as ProjectPriority | '';
    const newFilters = { ...filters };
    if (value) {
      newFilters.priority = value;
    } else {
      delete newFilters.priority;
    }
    onFiltersChange(newFilters);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [field, direction] = e.target.value.split(':') as [ProjectSort['field'], ProjectSort['direction']];
    onSortChange({ field, direction });
  };

  const hasActiveFilters = filters.status || filters.priority || filters.search;

  const handleReset = () => {
    setSearchValue('');
    onReset?.();
  };

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.searchWrapper}>
          <Input
            placeholder="Search projects..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            leftAddon={
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Status</label>
          <select
            className={styles.select}
            value={(filters.status as string) || ''}
            onChange={handleStatusChange}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Priority</label>
          <select
            className={styles.select}
            value={(filters.priority as string) || ''}
            onChange={handlePriorityChange}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Sort by</label>
          <select
            className={styles.select}
            value={`${sort.field}:${sort.direction}`}
            onChange={handleSortChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <div className={styles.actions}>
            <Button variant="ghost" size="sm" onClick={handleReset}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
