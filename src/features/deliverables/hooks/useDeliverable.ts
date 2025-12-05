import { useQuery } from '@tanstack/react-query';
import { deliverableService } from '../services/deliverableService';
import { deliverableKeys } from '../services/deliverableKeys';

export function useDeliverable(id: string | undefined) {
  return useQuery({
    queryKey: deliverableKeys.detail(id!),
    queryFn: () => deliverableService.getDeliverable(id!),
    enabled: !!id,
  });
}
