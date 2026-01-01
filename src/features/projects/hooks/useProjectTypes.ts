import { useQuery } from '@tanstack/react-query';
import { projectTypeService } from '@features/admin/services/projectTypeService';

export const projectConnectKeys = {
    types: () => ['projectTypes'] as const,
    activeTypes: () => ['projectTypes', 'active'] as const,
};

export function useProjectTypes(includeInactive = false) {
    return useQuery({
        queryKey: includeInactive ? projectConnectKeys.types() : projectConnectKeys.activeTypes(),
        queryFn: () => includeInactive
            ? projectTypeService.getAllProjectTypes()
            : projectTypeService.getProjectTypes(),
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
