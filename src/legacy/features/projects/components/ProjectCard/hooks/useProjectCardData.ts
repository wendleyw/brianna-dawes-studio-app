import { useQuery } from '@tanstack/react-query';
import type { Project } from '@features/projects/domain/project.types';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import type { User } from '@features/admin/domain/admin.types';
import { deliverableService } from '@features/deliverables/services/deliverableService';
import { adminService } from '@features/admin/services/adminService';

interface UseProjectCardDataProps {
  project: Project;
  enabled?: boolean;
}

export function useProjectCardData({ project, enabled = true }: UseProjectCardDataProps) {
  // Fetch deliverables
  const {
    data: deliverablesResponse,
    isLoading: isLoadingDeliverables
  } = useQuery({
    queryKey: ['deliverables', project.id],
    queryFn: () => deliverableService.getDeliverables({
      filters: { projectId: project.id },
      pageSize: 100
    }),
    enabled,
  });

  const deliverables = deliverablesResponse?.data || [];

  // Fetch all users (for designer assignment)
  const {
    data: allUsers = [],
    isLoading: isLoadingUsers
  } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => adminService.getUsers(),
    enabled,
  });

  // Compute stats
  const stats = {
    totalDeliverables: deliverables.length,
    completedDeliverables: deliverables.filter((d: Deliverable) => d.status === 'approved').length,
    pendingDeliverables: deliverables.filter((d: Deliverable) => d.status !== 'approved').length,
    completionPercentage: deliverables.length > 0
      ? Math.round((deliverables.filter((d: Deliverable) => d.status === 'approved').length / deliverables.length) * 100)
      : 0,
  };

  // Filter designers
  const designers = allUsers.filter((u: User) => u.role === 'designer');

  return {
    deliverables,
    isLoadingDeliverables,
    designers,
    isLoadingUsers,
    stats,
  };
}
