import { useQuery } from '@tanstack/react-query';
import { deliverableService } from '../services/deliverableService';
import { deliverableKeys } from '../services/deliverableKeys';

export function useDeliverableFeedback(deliverableId: string | undefined, versionId?: string) {
  return useQuery({
    queryKey: deliverableKeys.feedback(deliverableId!, versionId),
    queryFn: () => deliverableService.getFeedback(deliverableId!, versionId),
    enabled: !!deliverableId,
  });
}
