import type { DeliverablesQueryParams } from '../domain/deliverable.types';

export const deliverableKeys = {
  all: ['deliverables'] as const,
  lists: () => [...deliverableKeys.all, 'list'] as const,
  list: (params: DeliverablesQueryParams) => [...deliverableKeys.lists(), params] as const,
  details: () => [...deliverableKeys.all, 'detail'] as const,
  detail: (id: string) => [...deliverableKeys.details(), id] as const,
  versions: (deliverableId: string) => [...deliverableKeys.all, 'versions', deliverableId] as const,
  feedback: (deliverableId: string, versionId?: string) =>
    [...deliverableKeys.all, 'feedback', deliverableId, versionId] as const,
};
