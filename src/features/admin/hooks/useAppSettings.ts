import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { adminService, adminKeys } from '../services';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { UpdateAppSettingInput } from '../domain';

export function useAppSettings() {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
  }, [queryClient]);

  // Subscribe to realtime changes on app_settings table
  useRealtimeSubscription<{ id: string }>({
    table: 'app_settings',
    event: '*',
    onInsert: handleChange,
    onUpdate: handleChange,
    onDelete: handleChange,
  });

  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminService.getAppSettings(),
  });
}

export function useSetting<T = unknown>(key: string) {
  const queryClient = useQueryClient();

  const handleChange = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: adminKeys.setting(key) });
  }, [queryClient, key]);

  // Subscribe to realtime changes on this specific setting
  useRealtimeSubscription<{ key: string }>({
    table: 'app_settings',
    event: 'UPDATE',
    filter: `key=eq.${key}`,
    onUpdate: handleChange,
    enabled: !!key,
  });

  return useQuery({
    queryKey: adminKeys.setting(key),
    queryFn: () => adminService.getSetting(key) as Promise<T>,
  });
}

export function useAppSettingsMutations() {
  const queryClient = useQueryClient();

  const updateSetting = useMutation({
    mutationFn: (input: UpdateAppSettingInput) => adminService.updateSetting(input),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.setting(key) });
    },
  });

  const upsertSetting = useMutation({
    mutationFn: (input: UpdateAppSettingInput & { description?: string }) =>
      adminService.upsertSetting(input),
    onSuccess: (_, { key }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
      queryClient.invalidateQueries({ queryKey: adminKeys.setting(key) });
    },
  });

  return {
    updateSetting,
    upsertSetting,
    isUpdating: updateSetting.isPending || upsertSetting.isPending,
  };
}
