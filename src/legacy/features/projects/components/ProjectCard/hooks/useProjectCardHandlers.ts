import { useCallback } from 'react';
import type { Project, UpdateProjectInput } from '@features/projects/domain/project.types';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('ProjectCardHandlers');

interface UseProjectCardHandlersProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onUpdate?: (projectId: string, updates: UpdateProjectInput) => void;
  onArchive?: (projectId: string, reason: string) => void;
  onUnarchive?: (projectId: string) => void;
  onReview?: (projectId: string, notes: string) => void;
  onComplete?: (projectId: string, notes: string) => void;
  onViewBoard?: (project: Project) => void;
  openModal: (modal: string) => void;
  closeModal: () => void;
}

export function useProjectCardHandlers({
  project,
  onEdit,
  onUpdate,
  onArchive,
  onUnarchive,
  onReview,
  onComplete,
  onViewBoard,
  openModal,
  closeModal,
}: UseProjectCardHandlersProps) {

  const handleEdit = useCallback(() => {
    onEdit?.(project);
  }, [onEdit, project]);

  const handleViewBoard = useCallback(async () => {
    try {
      await onViewBoard?.(project);
    } catch (error) {
      logger.error('Failed to view board', error);
    }
  }, [onViewBoard, project]);

  const handleArchive = useCallback(async (reason: string) => {
    try {
      await onArchive?.(project.id, reason);
      closeModal();
    } catch (error) {
      logger.error('Failed to archive project', error);
    }
  }, [onArchive, project.id, closeModal]);

  const handleUnarchive = useCallback(async () => {
    try {
      await onUnarchive?.(project.id);
    } catch (error) {
      logger.error('Failed to unarchive project', error);
    }
  }, [onUnarchive, project.id]);

  const handleReview = useCallback(async (notes: string) => {
    try {
      await onReview?.(project.id, notes);
      closeModal();
    } catch (error) {
      logger.error('Failed to submit for review', error);
    }
  }, [onReview, project.id, closeModal]);

  const handleComplete = useCallback(async (notes: string) => {
    try {
      await onComplete?.(project.id, notes);
      closeModal();
    } catch (error) {
      logger.error('Failed to complete project', error);
    }
  }, [onComplete, project.id, closeModal]);

  const handleStatusChange = useCallback((status: Project['status']) => {
    onUpdate?.(project.id, { status });
  }, [onUpdate, project.id]);

  const handlePriorityChange = useCallback((priority: Project['priority']) => {
    onUpdate?.(project.id, { priority });
  }, [onUpdate, project.id]);

  const handleAssignDesigners = useCallback((designerIds: string[]) => {
    onUpdate?.(project.id, { designerIds });
    closeModal();
  }, [onUpdate, project.id, closeModal]);

  const handleUpdateDueDate = useCallback((dueDate: string) => {
    onUpdate?.(project.id, { dueDate });
  }, [onUpdate, project.id]);

  const handleOpenDrive = useCallback(() => {
    openModal('drive');
  }, [openModal]);

  const handleOpenReview = useCallback(() => {
    openModal('review');
  }, [openModal]);

  const handleOpenComplete = useCallback(() => {
    openModal('complete');
  }, [openModal]);

  const handleOpenDeliverable = useCallback(() => {
    openModal('deliverable');
  }, [openModal]);

  const handleOpenVersion = useCallback(() => {
    openModal('version');
  }, [openModal]);

  const handleOpenAssign = useCallback(() => {
    openModal('assign');
  }, [openModal]);

  const handleOpenArchive = useCallback(() => {
    openModal('archive');
  }, [openModal]);

  const handleOpenEdit = useCallback(() => {
    openModal('edit');
  }, [openModal]);

  const handleOpenClientRequest = useCallback(() => {
    openModal('clientRequest');
  }, [openModal]);

  const handleOpenClientApproval = useCallback(() => {
    openModal('clientApproval');
  }, [openModal]);

  const handleOpenClientCritical = useCallback(() => {
    openModal('clientCritical');
  }, [openModal]);

  return {
    handleEdit,
    handleViewBoard,
    handleArchive,
    handleUnarchive,
    handleReview,
    handleComplete,
    handleStatusChange,
    handlePriorityChange,
    handleAssignDesigners,
    handleUpdateDueDate,
    handleOpenDrive,
    handleOpenReview,
    handleOpenComplete,
    handleOpenDeliverable,
    handleOpenVersion,
    handleOpenAssign,
    handleOpenArchive,
    handleOpenEdit,
    handleOpenClientRequest,
    handleOpenClientApproval,
    handleOpenClientCritical,
  };
}
