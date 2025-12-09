import { useState, FormEvent } from 'react';
import { Button } from '@shared/ui';
import { createProjectSchema, updateProjectSchema } from '../../domain/project.schema';
import { STATUS_COLUMNS } from '@shared/lib/timelineStatus';
import { PRIORITY_OPTIONS } from '@shared/lib/priorityConfig';
import type { ProjectFormProps, ProjectFormData } from './ProjectForm.types';
import styles from './ProjectForm.module.css';

// Generate STATUS_OPTIONS from centralized STATUS_COLUMNS
const STATUS_OPTIONS = STATUS_COLUMNS.map(col => ({
  value: col.id,
  label: col.label,
}));

export function ProjectForm({
  project,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProjectFormProps) {
  const isEditing = !!project;

  const [formData, setFormData] = useState<ProjectFormData>({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'in_progress',
    priority: project?.priority || 'medium',
    startDate: project?.startDate?.split('T')[0] || '',
    dueDate: project?.dueDate?.split('T')[0] || '',
    clientId: project?.clientId || '',
    designerIds: project?.designers.map((d) => d.id) || [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleChange = (field: keyof ProjectFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSubmitError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const submitData = {
      name: formData.name,
      description: formData.description || null,
      status: formData.status as 'overdue' | 'urgent' | 'in_progress' | 'review' | 'done',
      priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      clientId: formData.clientId,
      designerIds: formData.designerIds,
    };

    const schema = isEditing ? updateProjectSchema : createProjectSchema;
    const result = schema.safeParse(submitData);

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProjectFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ProjectFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      await onSubmit(result.data as Parameters<typeof onSubmit>[0]);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Error saving project'
      );
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {submitError && <div className={styles.submitError}>{submitError}</div>}

      {/* Project Name */}
      <div className={styles.fieldCompact}>
        <input
          type="text"
          className={`${styles.inputCompact} ${styles.inputName}`}
          placeholder="Project name"
          value={formData.name}
          onChange={handleChange('name')}
          disabled={isLoading}
          required
        />
        {errors.name && <span className={styles.error}>{errors.name}</span>}
      </div>

      {/* Status & Priority - Chip Selection */}
      <div className={styles.chipRow}>
        <div className={styles.chipGroup}>
          <span className={styles.chipLabel}>Status</span>
          <div className={styles.chips}>
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.chip} ${formData.status === option.value ? styles.chipActive : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, status: option.value }))}
                disabled={isLoading}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chipRow}>
        <div className={styles.chipGroup}>
          <span className={styles.chipLabel}>Priority</span>
          <div className={styles.chips}>
            {PRIORITY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.chip} ${styles.chipPriority} ${formData.priority === option.value ? styles.chipActive : ''}`}
                onClick={() => setFormData(prev => ({ ...prev, priority: option.value }))}
                disabled={isLoading}
                data-priority={option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dates Row - Compact */}
      <div className={styles.datesRow}>
        <div className={styles.dateField}>
          <span className={styles.dateLabel}>Start</span>
          <input
            type="date"
            className={styles.dateInputCompact}
            value={formData.startDate}
            onChange={handleChange('startDate')}
            disabled={isLoading}
          />
        </div>
        <div className={styles.dateSeparator}>→</div>
        <div className={styles.dateField}>
          <span className={styles.dateLabel}>Due</span>
          <input
            type="date"
            className={styles.dateInputCompact}
            value={formData.dueDate}
            onChange={handleChange('dueDate')}
            disabled={isLoading}
          />
        </div>
      </div>
      {!isEditing && formData.dueDate && (
        <span className={styles.dueDateNote}>Due date will be pending approval</span>
      )}

      {/* Client ID - Compact */}
      <div className={styles.fieldCompact}>
        <span className={styles.fieldLabel}>Client ID</span>
        <input
          type="text"
          className={styles.inputCompact}
          placeholder="Client UUID"
          value={formData.clientId}
          onChange={handleChange('clientId')}
          disabled={isLoading}
          required
        />
        {errors.clientId && <span className={styles.error}>{errors.clientId}</span>}
      </div>

      {/* Description - Optional, collapsed by default */}
      <details className={styles.optionalSection}>
        <summary className={styles.optionalSummary}>Add description</summary>
        <textarea
          className={styles.textareaCompact}
          placeholder="Project goals and scope..."
          value={formData.description}
          onChange={handleChange('description')}
          disabled={isLoading}
          rows={3}
        />
      </details>

      {/* Actions */}
      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
          {isEditing ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
