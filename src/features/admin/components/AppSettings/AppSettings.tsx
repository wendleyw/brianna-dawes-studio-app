import { useState } from 'react';
import { Button, Input, Skeleton } from '@shared/ui';
import { useAppSettings, useAppSettingsMutations } from '../../hooks';
import styles from './AppSettings.module.css';

export function AppSettings() {
  const { data: settings, isLoading } = useAppSettings();
  const { updateSetting, isUpdating } = useAppSettingsMutations();

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (key: string, value: unknown) => {
    setEditingKey(key);
    setEditValue(typeof value === 'string' ? value : JSON.stringify(value));
  };

  const handleSave = async () => {
    if (!editingKey) return;
    setError(null);

    try {
      // Try to parse as JSON, otherwise use as string
      let parsedValue: unknown;
      try {
        parsedValue = JSON.parse(editValue);
      } catch {
        parsedValue = editValue;
      }

      await updateSetting.mutateAsync({
        key: editingKey,
        value: parsedValue,
      });
      setEditingKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update setting');
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValue('');
    setError(null);
  };

  if (isLoading) {
    return <Skeleton height={200} />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>App Settings</h2>
        <p className={styles.subtitle}>Configure global application settings</p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.settingsList}>
        {settings?.map((setting) => (
          <div key={setting.id} className={styles.settingItem}>
            <div className={styles.settingInfo}>
              <span className={styles.settingKey}>{formatKey(setting.key)}</span>
              {setting.description && (
                <span className={styles.settingDescription}>{setting.description}</span>
              )}
            </div>

            {editingKey === setting.key ? (
              <div className={styles.editForm}>
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Enter value"
                />
                <div className={styles.editActions}>
                  <Button size="sm" onClick={handleSave} isLoading={isUpdating}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className={styles.settingValue}>
                <code className={styles.valueCode}>
                  {formatValue(setting.value)}
                </code>
                <Button size="sm" variant="ghost" onClick={() => handleEdit(setting.key, setting.value)}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatKey(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
