import { useState, useEffect, useCallback } from 'react';
import { Button } from '@shared/ui';
import { projectTypeService, type ProjectType, type CreateProjectTypeInput, type UpdateProjectTypeInput } from '../../services/projectTypeService';
import { createLogger } from '@shared/lib/logger';
import styles from './ProjectTypesSettings.module.css';

const logger = createLogger('ProjectTypesSettings');

// Icons
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const RestoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="1 4 1 10 7 10" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
  </svg>
);

interface EditingType extends Partial<ProjectType> {
  isNew?: boolean;
}

export function ProjectTypesSettings() {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [editingType, setEditingType] = useState<EditingType | null>(null);

  // Load project types
  const loadProjectTypes = useCallback(async () => {
    try {
      setLoading(true);
      const types = showInactive
        ? await projectTypeService.getAllProjectTypes()
        : await projectTypeService.getProjectTypes();
      setProjectTypes(types);
      setError(null);
    } catch (err) {
      logger.error('Failed to load project types', err);
      setError('Failed to load project types');
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadProjectTypes();
  }, [loadProjectTypes]);

  // Start creating new type
  const handleAddNew = () => {
    setEditingType({
      isNew: true,
      value: '',
      label: '',
      shortLabel: '',
      days: 5,
      color: '#607D8B',
      icon: '',
      sortOrder: projectTypes.length + 1,
    });
  };

  // Start editing existing type
  const handleEdit = (type: ProjectType) => {
    setEditingType({ ...type });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditingType(null);
  };

  // Save changes
  const handleSave = async () => {
    if (!editingType) return;

    // Validate
    if (!editingType.value?.trim()) {
      setError('Value is required');
      return;
    }
    if (!editingType.label?.trim()) {
      setError('Label is required');
      return;
    }
    if (!editingType.shortLabel?.trim()) {
      setError('Short label is required');
      return;
    }
    if (!editingType.days || editingType.days < 1) {
      setError('Days must be at least 1');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (editingType.isNew) {
        const input: CreateProjectTypeInput = {
          value: editingType.value!.toLowerCase().replace(/\s+/g, '-'),
          label: editingType.label!,
          shortLabel: editingType.shortLabel!,
          days: editingType.days!,
          color: editingType.color || '#607D8B',
          icon: editingType.icon || null,
          sortOrder: editingType.sortOrder ?? projectTypes.length + 1,
        };
        await projectTypeService.createProjectType(input);
        logger.info('Created new project type', { value: input.value });
      } else {
        // Only include fields that have defined values
        const input: UpdateProjectTypeInput = {};
        if (editingType.value !== undefined) input.value = editingType.value;
        if (editingType.label !== undefined) input.label = editingType.label;
        if (editingType.shortLabel !== undefined) input.shortLabel = editingType.shortLabel;
        if (editingType.days !== undefined) input.days = editingType.days;
        if (editingType.color !== undefined) input.color = editingType.color;
        if (editingType.icon !== undefined) input.icon = editingType.icon;
        if (editingType.sortOrder !== undefined) input.sortOrder = editingType.sortOrder;

        await projectTypeService.updateProjectType(editingType.id!, input);
        logger.info('Updated project type', { id: editingType.id });
      }

      setEditingType(null);
      await loadProjectTypes();
    } catch (err) {
      logger.error('Failed to save project type', err);
      setError('Failed to save project type');
    } finally {
      setSaving(false);
    }
  };

  // Delete (soft) project type
  const handleDelete = async (type: ProjectType) => {
    if (!confirm(`Are you sure you want to delete "${type.label}"?`)) return;

    try {
      setSaving(true);
      await projectTypeService.deleteProjectType(type.id);
      await loadProjectTypes();
      logger.info('Deleted project type', { id: type.id });
    } catch (err) {
      logger.error('Failed to delete project type', err);
      setError('Failed to delete project type');
    } finally {
      setSaving(false);
    }
  };

  // Reactivate deleted project type
  const handleReactivate = async (type: ProjectType) => {
    try {
      setSaving(true);
      await projectTypeService.reactivateProjectType(type.id);
      await loadProjectTypes();
      logger.info('Reactivated project type', { id: type.id });
    } catch (err) {
      logger.error('Failed to reactivate project type', err);
      setError('Failed to reactivate project type');
    } finally {
      setSaving(false);
    }
  };

  // Update form field
  const updateField = (field: keyof EditingType, value: string | number | null) => {
    if (!editingType) return;
    setEditingType({ ...editingType, [field]: value });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading project types...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Project Types</h3>
          <p className={styles.subtitle}>
            Manage project types and their default due date calculation (in business days).
          </p>
        </div>
        <div className={styles.headerActions}>
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show deleted
          </label>
          <Button onClick={handleAddNew} disabled={!!editingType}>
            <PlusIcon /> Add Type
          </Button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Edit/Create Form */}
      {editingType && (
        <div className={styles.editForm}>
          <h4 className={styles.formTitle}>
            {editingType.isNew ? 'New Project Type' : 'Edit Project Type'}
          </h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Value (ID)</label>
              <input
                type="text"
                value={editingType.value || ''}
                onChange={(e) => updateField('value', e.target.value)}
                placeholder="e.g., social-post-design"
                disabled={!editingType.isNew}
              />
              <span className={styles.hint}>Unique identifier, use lowercase and dashes</span>
            </div>

            <div className={styles.formGroup}>
              <label>Full Label</label>
              <input
                type="text"
                value={editingType.label || ''}
                onChange={(e) => updateField('label', e.target.value)}
                placeholder="e.g., Social Post Design (Carousel / Static)"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Short Label (for badges)</label>
              <input
                type="text"
                value={editingType.shortLabel || ''}
                onChange={(e) => updateField('shortLabel', e.target.value)}
                placeholder="e.g., Social Post"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Default Days</label>
              <input
                type="number"
                min="1"
                value={editingType.days || 5}
                onChange={(e) => updateField('days', parseInt(e.target.value) || 5)}
              />
              <span className={styles.hint}>Business days for due date calculation</span>
            </div>

            <div className={styles.formGroup}>
              <label>Color</label>
              <div className={styles.colorPicker}>
                <input
                  type="color"
                  value={editingType.color || '#607D8B'}
                  onChange={(e) => updateField('color', e.target.value)}
                />
                <input
                  type="text"
                  value={editingType.color || '#607D8B'}
                  onChange={(e) => updateField('color', e.target.value)}
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Sort Order</label>
              <input
                type="number"
                min="0"
                value={editingType.sortOrder || 0}
                onChange={(e) => updateField('sortOrder', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className={styles.formActions}>
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {/* Project Types List */}
      <div className={styles.typesList}>
        {projectTypes.map((type) => (
          <div
            key={type.id}
            className={`${styles.typeItem} ${!type.isActive ? styles.inactive : ''}`}
          >
            <div className={styles.typePreview}>
              <span
                className={styles.typeBadge}
                style={{ backgroundColor: type.color }}
              >
                {type.shortLabel}
              </span>
            </div>

            <div className={styles.typeInfo}>
              <div className={styles.typeName}>{type.label}</div>
              <div className={styles.typeMeta}>
                <code>{type.value}</code>
                <span className={styles.typeDays}>{type.days} days</span>
                {!type.isActive && <span className={styles.deletedBadge}>Deleted</span>}
              </div>
            </div>

            <div className={styles.typeActions}>
              {type.isActive ? (
                <>
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleEdit(type)}
                    disabled={!!editingType || saving}
                    title="Edit"
                  >
                    <EditIcon />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.danger}`}
                    onClick={() => handleDelete(type)}
                    disabled={!!editingType || saving}
                    title="Delete"
                  >
                    <TrashIcon />
                  </button>
                </>
              ) : (
                <button
                  className={`${styles.iconBtn} ${styles.success}`}
                  onClick={() => handleReactivate(type)}
                  disabled={!!editingType || saving}
                  title="Restore"
                >
                  <RestoreIcon />
                </button>
              )}
            </div>
          </div>
        ))}

        {projectTypes.length === 0 && (
          <div className={styles.emptyState}>
            No project types found. Click "Add Type" to create one.
          </div>
        )}
      </div>
    </div>
  );
}
