import { useQuery } from '@tanstack/react-query';
import { deliverableService } from '../services/deliverableService';
import { deliverableKeys } from '../services/deliverableKeys';

export function useDeliverableVersions(deliverableId: string | undefined) {
  return useQuery({
    queryKey: deliverableKeys.versions(deliverableId!),
    queryFn: () => deliverableService.getVersions(deliverableId!),
    enabled: !!deliverableId,
  });
}
