import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, adminKeys } from '../services';
import type { UpdateAppSettingInput } from '../domain';

export function useAppSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminService.getAppSettings(),
  });
}

export function useSetting<T = unknown>(key: string) {
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

  return {
    updateSetting,
    isUpdating: updateSetting.isPending,
  };
}
