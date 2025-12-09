import { useState, FormEvent } from 'react';
import { Input, Button } from '@shared/ui';
import { createProjectSchema, updateProjectSchema } from '../../domain/project.schema';
import { STATUS_COLUMNS } from '@shared/lib/timelineStatus';
import { PRIORITY_OPTIONS } from '@shared/lib/priorityConfig';
import type { ProjectFormProps, ProjectFormData } from './ProjectForm.types';
import styles from './ProjectForm.module.css';

// Edit icon for due date field
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

// Generate STATUS_OPTIONS from centralized STATUS_COLUMNS
const STATUS_OPTIONS = STATUS_COLUMNS.map(col => ({
  value: col.id,
  label: col.label,
}));

// PRIORITY_OPTIONS is now imported from @shared/lib/priorityConfig

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
  const [isEditingDueDate, setIsEditingDueDate] = useState(false);

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
      // Cast to the expected type for onSubmit
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

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Basic Information</h3>

        <div className={styles.field}>
          <Input
            label="Project Name"
            placeholder="E.g.: Corporate Website Redesign"
            value={formData.name}
            onChange={handleChange('name')}
            {...(errors.name ? { error: errors.name } : {})}
            disabled={isLoading}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="project-description" className={styles.label}>Description</label>
          <textarea
            id="project-description"
            className={styles.textarea}
            placeholder="Describe the project goals and scope..."
            value={formData.description}
            onChange={handleChange('description')}
            disabled={isLoading}
            aria-describedby={errors.description ? 'description-error' : undefined}
          />
          {errors.description && <span id="description-error" className={styles.error}>{errors.description}</span>}
        </div>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="project-status" className={styles.label}>Status</label>
            <select
              id="project-status"
              className={styles.select}
              value={formData.status}
              onChange={handleChange('status')}
              disabled={isLoading}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor="project-priority" className={styles.label}>Priority</label>
            <select
              id="project-priority"
              className={styles.select}
              value={formData.priority}
              onChange={handleChange('priority')}
              disabled={isLoading}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Dates</h3>

        <div className={styles.row}>
          <div className={styles.field}>
            <label htmlFor="project-start-date" className={styles.label}>Start Date</label>
            <input
              id="project-start-date"
              type="date"
              className={styles.dateInput}
              value={formData.startDate}
              onChange={handleChange('startDate')}
              disabled={isLoading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="project-due-date" className={styles.label}>Specific due date</label>
            <div className={styles.dueDateWrapper}>
              {isEditingDueDate ? (
                <input
                  id="project-due-date"
                  type="date"
                  className={styles.dateInputEditing}
                  value={formData.dueDate}
                  onChange={handleChange('dueDate')}
                  disabled={isLoading}
                  autoFocus
                  onBlur={() => setIsEditingDueDate(false)}
                />
              ) : (
                <>
                  <div className={`${styles.dueDateDisplay} ${formData.dueDate ? styles.hasValue : ''}`}>
                    {formData.dueDate
                      ? new Date(formData.dueDate + 'T00:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Not set'}
                  </div>
                  <button
                    type="button"
                    className={styles.dueDateEditBtn}
                    onClick={() => setIsEditingDueDate(true)}
                    disabled={isLoading}
                    title="Set due date"
                  >
                    <EditIcon />
                  </button>
                </>
              )}
            </div>
            {!isEditing && formData.dueDate && (
              <span className={styles.dueDateNote}>Due date will be pending approval</span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Assignment</h3>

        <div className={styles.field}>
          <Input
            label="Client ID"
            placeholder="Client UUID"
            value={formData.clientId}
            onChange={handleChange('clientId')}
            {...(errors.clientId ? { error: errors.clientId } : {})}
            disabled={isLoading}
            required
            helperText="Select the client responsible for this project"
          />
        </div>
      </div>

      <div className={styles.actions}>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {isEditing ? 'Save Changes' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
