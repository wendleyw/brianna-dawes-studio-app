import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { deliverableService } from '../services/deliverableService';
import { deliverableKeys } from '../services/deliverableKeys';
import type { DeliverablesQueryParams } from '../domain/deliverable.types';

export function useDeliverables(params: DeliverablesQueryParams = {}) {
  return useQuery({
    queryKey: deliverableKeys.list(params),
    queryFn: () => deliverableService.getDeliverables(params),
    placeholderData: keepPreviousData,
  });
}
