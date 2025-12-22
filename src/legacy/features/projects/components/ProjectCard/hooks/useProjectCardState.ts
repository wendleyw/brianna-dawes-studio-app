import { useState } from 'react';

type ModalType =
  | 'drive'
  | 'review'
  | 'complete'
  | 'deliverable'
  | 'version'
  | 'assign'
  | 'archive'
  | 'edit'
  | 'clientRequest'
  | 'clientApproval'
  | 'clientCritical'
  | null;

interface DeliverableFormData {
  name: string;
  type: string;
  status: 'pending' | 'wip' | 'review' | 'approved';
  dueDate: string;
}

interface ProjectCardState {
  // Modal state
  activeModal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;

  // Expanded state
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;

  // Form states
  deliverableForm: DeliverableFormData;
  setDeliverableForm: (data: DeliverableFormData) => void;

  archiveReason: string;
  setArchiveReason: (reason: string) => void;

  reviewNotes: string;
  setReviewNotes: (notes: string) => void;

  completionNotes: string;
  setCompletionNotes: (notes: string) => void;

  // Version state
  selectedVersion: string | null;
  setSelectedVersion: (version: string | null) => void;

  // Assignment state
  selectedDesigners: string[];
  setSelectedDesigners: (designers: string[]) => void;
}

export function useProjectCardState(): ProjectCardState {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Form states
  const [deliverableForm, setDeliverableForm] = useState<DeliverableFormData>({
    name: '',
    type: 'design',
    status: 'pending',
    dueDate: '',
  });

  const [archiveReason, setArchiveReason] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [selectedDesigners, setSelectedDesigners] = useState<string[]>([]);

  const openModal = (modal: ModalType) => setActiveModal(modal);
  const closeModal = () => setActiveModal(null);

  return {
    activeModal,
    openModal,
    closeModal,
    isExpanded,
    setIsExpanded,
    deliverableForm,
    setDeliverableForm,
    archiveReason,
    setArchiveReason,
    reviewNotes,
    setReviewNotes,
    completionNotes,
    setCompletionNotes,
    selectedVersion,
    setSelectedVersion,
    selectedDesigners,
    setSelectedDesigners,
  };
}
