import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deliverableService } from '../services/deliverableService';
import { deliverableKeys } from '../services/deliverableKeys';
import type {
  CreateDeliverableInput,
  UpdateDeliverableInput,
  UploadVersionInput,
  Deliverable,
  DeliverableVersion,
  DeliverableFeedback,
} from '../domain/deliverable.types';

export function useCreateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDeliverableInput) => deliverableService.createDeliverable(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.lists() });
    },
  });
}

export function useUpdateDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDeliverableInput }) =>
      deliverableService.updateDeliverable(id, input),
    onSuccess: (deliverable: Deliverable) => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.lists() });
      queryClient.setQueryData(deliverableKeys.detail(deliverable.id), deliverable);
    },
  });
}

export function useDeleteDeliverable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deliverableService.deleteDeliverable(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.lists() });
      queryClient.removeQueries({ queryKey: deliverableKeys.detail(id) });
    },
  });
}

export function useUploadVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UploadVersionInput) => deliverableService.uploadVersion(input),
    onSuccess: (version: DeliverableVersion) => {
      queryClient.invalidateQueries({ queryKey: deliverableKeys.detail(version.deliverableId) });
      queryClient.invalidateQueries({ queryKey: deliverableKeys.versions(version.deliverableId) });
      queryClient.invalidateQueries({ queryKey: deliverableKeys.lists() });
    },
  });
}

export function useAddFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      deliverableId,
      versionId,
      content,
      position,
    }: {
      deliverableId: string;
      versionId: string;
      content: string;
      position?: { x: number; y: number } | null;
    }) => deliverableService.addFeedback(deliverableId, versionId, content, position),
    onSuccess: (feedback: DeliverableFeedback) => {
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.feedback(feedback.deliverableId),
      });
      queryClient.invalidateQueries({ queryKey: deliverableKeys.detail(feedback.deliverableId) });
    },
  });
}

export function useResolveFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (feedbackId: string) => deliverableService.resolveFeedback(feedbackId),
    onSuccess: (feedback: DeliverableFeedback) => {
      queryClient.invalidateQueries({
        queryKey: deliverableKeys.feedback(feedback.deliverableId),
      });
    },
  });
}
