/**
 * ProjectCard Context
 *
 * Provides project actions and state to all ProjectCard sub-components.
 * Eliminates prop drilling through the component hierarchy.
 */

import { createContext, useContext, useCallback, useState, useMemo, type ReactNode } from 'react';
import type { Project, UpdateProjectInput, ProjectStatus, ProjectPriority } from '../../domain/project.types';
import type { Deliverable, DeliverableType, DeliverableStatus } from '@features/deliverables/domain/deliverable.types';
import { DEFAULT_DELIVERABLE_FORM } from '@features/deliverables/domain/deliverable.constants';
import { useAuth } from '@features/auth';

// Types for deliverable form
export interface DeliverableFormData {
  name: string;
  type: DeliverableType;
  version: string;
  count: number;
  bonusCount: number;
  hoursSpent: number;
  status: DeliverableStatus;
  notes: string;
  externalUrl: string;
  miroUrl: string;
}

// Modal state type
export interface ModalState {
  drive: boolean;
  review: boolean;
  complete: boolean;
  deliverable: boolean;
  version: boolean;
  assign: boolean;
  archive: boolean;
  edit: boolean;
  clientRequestChanges: boolean;
  clientApprove: boolean;
  clientCritical: boolean;
  editDeliverable: Deliverable | null;
  deleteDeliverable: Deliverable | null;
}

// Context type
interface ProjectCardContextValue {
  // Project data
  project: Project;

  // User info
  isAdmin: boolean;
  isClient: boolean;
  isAssignedClient: boolean;

  // Project state
  isInReview: boolean;
  isDone: boolean;
  isArchived: boolean;

  // Expand state
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  showDeliverables: boolean;
  setShowDeliverables: (value: boolean) => void;

  // Modal controls
  modals: ModalState;
  openModal: (modal: keyof Omit<ModalState, 'editDeliverable' | 'deleteDeliverable'>) => void;
  closeModal: (modal: keyof Omit<ModalState, 'editDeliverable' | 'deleteDeliverable'>) => void;
  setEditingDeliverable: (deliverable: Deliverable | null) => void;
  setDeletingDeliverable: (deliverable: Deliverable | null) => void;

  // Form states
  driveUrl: string;
  setDriveUrl: (url: string) => void;
  archiveReason: string;
  setArchiveReason: (reason: string) => void;
  selectedDesigners: string[];
  setSelectedDesigners: React.Dispatch<React.SetStateAction<string[]>>;
  deliverableForm: DeliverableFormData;
  setDeliverableForm: React.Dispatch<React.SetStateAction<DeliverableFormData>>;
  editForm: {
    name: string;
    description: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    startDate: string;
    dueDate: string;
  };
  setEditForm: React.Dispatch<React.SetStateAction<{
    name: string;
    description: string;
    status: ProjectStatus;
    priority: ProjectPriority;
    startDate: string;
    dueDate: string;
  }>>;

  // Loading states
  isEditLoading: boolean;
  setIsEditLoading: (loading: boolean) => void;
  isAddingDeliverable: boolean;
  setIsAddingDeliverable: (loading: boolean) => void;

  // Callbacks from parent
  onViewBoard: ((project: Project) => void) | undefined;
  onCardClick: ((project: Project) => void) | undefined;
  onUpdateGoogleDrive: ((projectId: string, url: string) => void) | undefined;
  onUpdateStatus: ((projectId: string, status: string, options?: { markAsReviewed?: boolean }) => void) | undefined;
  onUpdate: ((projectId: string, updates: UpdateProjectInput) => Promise<void>) | undefined;
  onArchive: ((project: Project, reason?: string) => void) | undefined;
  onReview: ((project: Project) => void) | undefined;
  onComplete: ((project: Project) => void) | undefined;
  onCreateVersion: ((project: Project) => void) | undefined;
  onAssignDesigner: ((projectId: string, designerIds: string[]) => void) | undefined;
}

const ProjectCardContext = createContext<ProjectCardContextValue | null>(null);

// Hook to access context
export function useProjectCard() {
  const context = useContext(ProjectCardContext);
  if (!context) {
    throw new Error('useProjectCard must be used within ProjectCardProvider');
  }
  return context;
}

// Provider props
interface ProjectCardProviderProps {
  project: Project;
  children: ReactNode;
  onViewBoard?: (project: Project) => void;
  onCardClick?: (project: Project) => void;
  onUpdateGoogleDrive?: (projectId: string, url: string) => void;
  onUpdateStatus?: (projectId: string, status: string, options?: { markAsReviewed?: boolean }) => void;
  onUpdate?: (projectId: string, updates: UpdateProjectInput) => Promise<void>;
  onArchive?: (project: Project, reason?: string) => void;
  onReview?: (project: Project) => void;
  onComplete?: (project: Project) => void;
  onCreateVersion?: (project: Project) => void;
  onAssignDesigner?: (projectId: string, designerIds: string[]) => void;
}

export function ProjectCardProvider({
  project,
  children,
  onViewBoard,
  onCardClick,
  onUpdateGoogleDrive,
  onUpdateStatus,
  onUpdate,
  onArchive,
  onReview,
  onComplete,
  onCreateVersion,
  onAssignDesigner,
}: ProjectCardProviderProps) {
  const { user } = useAuth();

  // User role checks
  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const isAssignedClient = isClient && project.clientId === user?.id;

  // Project state checks
  const isInReview = project.status === 'review';
  const isDone = project.status === 'done';
  const isArchived = project.archivedAt !== null;

  // Expand states
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(false);

  // Modal states
  const [modals, setModals] = useState<ModalState>({
    drive: false,
    review: false,
    complete: false,
    deliverable: false,
    version: false,
    assign: false,
    archive: false,
    edit: false,
    clientRequestChanges: false,
    clientApprove: false,
    clientCritical: false,
    editDeliverable: null,
    deleteDeliverable: null,
  });

  const openModal = useCallback((modal: keyof Omit<ModalState, 'editDeliverable' | 'deleteDeliverable'>) => {
    setModals(prev => ({ ...prev, [modal]: true }));
  }, []);

  const closeModal = useCallback((modal: keyof Omit<ModalState, 'editDeliverable' | 'deleteDeliverable'>) => {
    setModals(prev => ({ ...prev, [modal]: false }));
  }, []);

  const setEditingDeliverable = useCallback((deliverable: Deliverable | null) => {
    setModals(prev => ({ ...prev, editDeliverable: deliverable }));
  }, []);

  const setDeletingDeliverable = useCallback((deliverable: Deliverable | null) => {
    setModals(prev => ({ ...prev, deleteDeliverable: deliverable }));
  }, []);

  // Form states
  const [driveUrl, setDriveUrl] = useState(project.googleDriveUrl || '');
  const [archiveReason, setArchiveReason] = useState('');
  const [selectedDesigners, setSelectedDesigners] = useState<string[]>(
    project.designers.map(d => d.id)
  );
  const [deliverableForm, setDeliverableForm] = useState<DeliverableFormData>(DEFAULT_DELIVERABLE_FORM as DeliverableFormData);
  const [editForm, setEditForm] = useState({
    name: project.name,
    description: project.description || '',
    status: project.status,
    priority: project.priority,
    startDate: project.startDate?.split('T')[0] || '',
    dueDate: project.dueDate?.split('T')[0] || '',
  });

  // Loading states
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);

  const value = useMemo<ProjectCardContextValue>(() => ({
    project,
    isAdmin,
    isClient,
    isAssignedClient,
    isInReview,
    isDone,
    isArchived,
    isExpanded,
    setIsExpanded,
    showDeliverables,
    setShowDeliverables,
    modals,
    openModal,
    closeModal,
    setEditingDeliverable,
    setDeletingDeliverable,
    driveUrl,
    setDriveUrl,
    archiveReason,
    setArchiveReason,
    selectedDesigners,
    setSelectedDesigners,
    deliverableForm,
    setDeliverableForm,
    editForm,
    setEditForm,
    isEditLoading,
    setIsEditLoading,
    isAddingDeliverable,
    setIsAddingDeliverable,
    onViewBoard,
    onCardClick,
    onUpdateGoogleDrive,
    onUpdateStatus,
    onUpdate,
    onArchive,
    onReview,
    onComplete,
    onCreateVersion,
    onAssignDesigner,
  }), [
    project,
    isAdmin,
    isClient,
    isAssignedClient,
    isInReview,
    isDone,
    isArchived,
    isExpanded,
    showDeliverables,
    modals,
    openModal,
    closeModal,
    setEditingDeliverable,
    setDeletingDeliverable,
    driveUrl,
    archiveReason,
    selectedDesigners,
    deliverableForm,
    editForm,
    isEditLoading,
    isAddingDeliverable,
    onViewBoard,
    onCardClick,
    onUpdateGoogleDrive,
    onUpdateStatus,
    onUpdate,
    onArchive,
    onReview,
    onComplete,
    onCreateVersion,
    onAssignDesigner,
  ]);

  return (
    <ProjectCardContext.Provider value={value}>
      {children}
    </ProjectCardContext.Provider>
  );
}
