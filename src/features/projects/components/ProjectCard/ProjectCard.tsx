import { useState, useMemo } from 'react';
import { Badge, Dialog, Input, Button } from '@shared/ui';
import { useAuth } from '@features/auth';
import { useDeliverables, useCreateDeliverable, useUpdateDeliverable, useDeleteDeliverable } from '@features/deliverables/hooks';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import type { DeliverableType, DeliverableStatus } from '@features/deliverables/domain/deliverable.types';
import { useUsers } from '@features/admin/hooks/useUsers';
import { useProjects } from '../../hooks/useProjects';
import { createLogger } from '@shared/lib/logger';
import {
  getStatusColumn,
  getStatusVariant,
} from '@shared/lib/timelineStatus';
import type { ProjectCardProps } from './ProjectCard.types';
import styles from './ProjectCard.module.css';

const logger = createLogger('ProjectCard');

const PRIORITY_MAP = {
  low: { label: 'STANDARD', color: '#10B981' },      // Green - matches form
  medium: { label: 'MEDIUM', color: '#F59E0B' },     // Yellow/Amber - matches form
  high: { label: 'HIGH', color: '#F97316' },         // Orange - matches form
  urgent: { label: 'URGENT', color: '#EF4444' },     // Red - matches form
};

// Deliverable type options
const DELIVERABLE_TYPES = [
  { value: 'concept' as DeliverableType, label: 'Concept', description: 'Initial ideas' },
  { value: 'design' as DeliverableType, label: 'Design', description: 'Main design work' },
  { value: 'revision' as DeliverableType, label: 'Revision', description: 'Updates & changes' },
  { value: 'final' as DeliverableType, label: 'Final', description: 'Ready to deliver' },
] as const;

// Deliverable status options
const DELIVERABLE_STATUSES = [
  { value: 'draft' as DeliverableStatus, label: 'Draft' },
  { value: 'in_progress' as DeliverableStatus, label: 'In Progress' },
  { value: 'in_review' as DeliverableStatus, label: 'In Review' },
  { value: 'approved' as DeliverableStatus, label: 'Approved' },
  { value: 'delivered' as DeliverableStatus, label: 'Delivered' },
] as const;

// Initial deliverable form state
const initialDeliverableForm = {
  name: '',
  type: 'design' as DeliverableType,
  version: '1.0',
  count: 1,
  bonusCount: 0,
  hoursSpent: 0,
  status: 'in_progress' as DeliverableStatus,
  notes: '',
  externalUrl: '',
  miroUrl: '',
};

// Project type configuration with colors
const PROJECT_TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'website-ui-design': { label: 'Website UI', color: '#3B82F6', icon: '🌐' },
  'marketing-campaign': { label: 'Marketing', color: '#8B5CF6', icon: '📣' },
  'video-production': { label: 'Video', color: '#EF4444', icon: '🎬' },
  'email-design': { label: 'Email', color: '#10B981', icon: '📧' },
  'social-post-carousel': { label: 'Social Post', color: '#F59E0B', icon: '📱' },
};

// Extract project type from briefing timeline or description
function getProjectType(project: { briefing?: { timeline?: string | null; projectType?: string | null } | null; description?: string | null }): { label: string; color: string; icon: string } | null {
  // Check briefing.projectType first
  if (project.briefing?.projectType) {
    const config = PROJECT_TYPE_CONFIG[project.briefing.projectType];
    if (config) return config;
  }

  // Try to extract from briefing.timeline (format: "Website UI Design (45 days) - Target: ...")
  const timeline = project.briefing?.timeline || '';
  const desc = project.description || '';
  const textToSearch = timeline + ' ' + desc;

  for (const [key, config] of Object.entries(PROJECT_TYPE_CONFIG)) {
    // Check for the key directly or the label
    if (textToSearch.toLowerCase().includes(key) ||
        textToSearch.toLowerCase().includes(config.label.toLowerCase())) {
      return config;
    }
  }

  // Try to match longer label variations
  if (textToSearch.includes('Website UI Design')) return PROJECT_TYPE_CONFIG['website-ui-design'] || null;
  if (textToSearch.includes('Marketing Campaign')) return PROJECT_TYPE_CONFIG['marketing-campaign'] || null;
  if (textToSearch.includes('Video Production')) return PROJECT_TYPE_CONFIG['video-production'] || null;
  if (textToSearch.includes('Email Design')) return PROJECT_TYPE_CONFIG['email-design'] || null;
  if (textToSearch.includes('Social Post')) return PROJECT_TYPE_CONFIG['social-post-carousel'] || null;

  return null;
}

// Icons
const ClientIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

const PackageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const BoardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
  </svg>
);

const DriveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.71 3.5L1.15 15l3.43 6 6.56-11.5L7.71 3.5zm1.44 0l6.56 11.5h6.56l-6.56-11.5H9.15zm7.41 12.5H3.44l3.43 6h13.12l-3.43-6z"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

const ArchiveIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="21 8 21 21 3 21 3 8"/>
    <rect x="1" y="3" width="22" height="5"/>
    <line x1="10" y1="12" x2="14" y2="12"/>
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform 0.2s ease'
    }}
  >
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

const PencilIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

export function ProjectCard({
  project,
  onEdit,
  onViewBoard,
  onUpdateGoogleDrive,
  onUpdateStatus,
  onArchive,
  onReview,
  onComplete,
  onCreateStage,
  onAssignDesigner,
  onOpenStatusModal,
  isSelected = false,
}: ProjectCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [showDeliverables, setShowDeliverables] = useState(false);

  // Modal states
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showClientApproveModal, setShowClientApproveModal] = useState(false);
  const [showClientCriticalModal, setShowClientCriticalModal] = useState(false);

  // Form states
  const [driveUrl, setDriveUrl] = useState(project.googleDriveUrl || '');
  const [archiveReason, setArchiveReason] = useState('');
  const [selectedDesigners, setSelectedDesigners] = useState<string[]>(
    project.designers.map(d => d.id)
  );

  // Deliverable form state
  const [deliverableForm, setDeliverableForm] = useState(initialDeliverableForm);
  const [isAddingDeliverable, setIsAddingDeliverable] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [deletingDeliverable, setDeletingDeliverable] = useState<Deliverable | null>(null);

  // Deliverable mutations
  const createDeliverable = useCreateDeliverable();
  const updateDeliverable = useUpdateDeliverable();
  const deleteDeliverable = useDeleteDeliverable();

  // Fetch deliverables for this project
  const { data: deliverablesData } = useDeliverables({ filters: { projectId: project.id } });
  const deliverables = deliverablesData?.data || [];

  // Fetch all users to get designers
  const { data: usersData } = useUsers();
  const allUsers = usersData || [];
  const designers = allUsers.filter((u: { role: string }) => u.role === 'designer');

  // Fetch all projects to calculate designer workload (skip role filter for this)
  const { data: allProjectsData } = useProjects({ skipRoleFilter: true });
  const allProjects = allProjectsData?.data || [];

  // Calculate total assets and bonus assets from deliverables
  const assetTotals = useMemo(() => {
    const totalAssets = deliverables.reduce((sum, d) => sum + (d.count || 0), 0);
    const totalBonus = deliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0);
    return { totalAssets, totalBonus };
  }, [deliverables]);

  // Calculate designer workload
  const designersWithWorkload = useMemo(() => {
    return designers.map((designer: { id: string; name: string; email: string; avatarUrl?: string | null }) => {
      const designerProjects = allProjects.filter(p =>
        p.designers.some(d => d.id === designer.id)
      );
      // Active projects = not done
      const activeProjects = designerProjects.filter(p => p.status !== 'done').length;
      // In progress = critical, urgent, in_progress, or overdue
      const inProgressProjects = designerProjects.filter(p =>
        ['critical', 'urgent', 'in_progress', 'overdue'].includes(p.status)
      ).length;

      return {
        ...designer,
        activeProjects,
        inProgressProjects,
      };
    });
  }, [designers, allProjects]);

  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const isInReview = project.status === 'review';
  // Check if current user is the assigned client for this project
  const isAssignedClient = isClient && project.clientId === user?.id;

  // Get status column info (status is now direct from DB)
  const statusColumn = getStatusColumn(project.status);
  const statusVariant = getStatusVariant(project.status);

  // Debug: log status
  logger.debug('Status mapping', { name: project.name, dbStatus: project.status, badge: statusColumn.label });

  const priority = PRIORITY_MAP[project.priority];

  // Calculate days left/overdue
  const getDaysInfo = () => {
    if (!project.dueDate) return null;
    const due = new Date(project.dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `${Math.abs(diff)} days overdue`, isOverdue: true };
    if (diff === 0) return { text: 'Due today', isOverdue: false };
    return { text: `${diff} days left`, isOverdue: false };
  };

  // Calculate progress based on deliverables or project status
  const getProgress = () => {
    // If there are deliverables, calculate based on completed/approved/delivered
    if (deliverables.length > 0) {
      const completedCount = deliverables.filter(d =>
        d.status === 'approved' || d.status === 'delivered'
      ).length;
      return Math.round((completedCount / deliverables.length) * 100);
    }

    // Fall back to status-based progress
    const statusProgress: Record<string, number> = {
      'draft': 5,
      'pending': 10,
      'in_progress': 40,
      'wip': 40,
      'review': 70,
      'approved': 90,
      'done': 100,
      'completed': 100,
    };
    return statusProgress[project.status] || 0;
  };

  const daysInfo = getDaysInfo();
  const progress = getProgress();

  // Event handlers
  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleViewBoard = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Try to zoom to project frame on Miro board
    if (typeof miro !== 'undefined') {
      try {
        const allItems = await miro.board.get();

        // First try to find by miroBoardId (stored Miro item ID)
        if (project.miroBoardId) {
          const itemById = allItems.find((item: { id?: string }) => item.id === project.miroBoardId);
          if (itemById) {
            await miro.board.viewport.zoomTo([itemById]);
            return;
          }
        }

        // Try to find frame with project ID in title
        const frames = await miro.board.get({ type: 'frame' });
        const projectFrame = frames.find((frame: { title?: string; id?: string }) =>
          frame.title?.includes(project.id)
        );

        if (projectFrame) {
          await miro.board.viewport.zoomTo([projectFrame]);
          return;
        }

        // Try to find card/sticky with project ID in content
        const projectItem = allItems.find((item: { content?: string; title?: string }) =>
          item.content?.includes(project.id) ||
          item.title?.includes(project.id)
        );

        if (projectItem) {
          await miro.board.viewport.zoomTo([projectItem]);
          return;
        }
      } catch (err) {
        logger.debug('Could not find project on board', err);
      }
    }

    // Fall back to callback or opening URL
    if (onViewBoard) {
      onViewBoard(project);
    } else if (project.miroBoardUrl) {
      window.open(project.miroBoardUrl, '_blank');
    }
  };

  const handleGoogleDrive = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (project.googleDriveUrl) {
      // Open the link if it exists
      window.open(project.googleDriveUrl, '_blank', 'noopener,noreferrer');
    } else if (isAdmin) {
      // Only admin can open modal to set URL
      setShowDriveModal(true);
    }
  };

  const handleSaveDriveUrl = () => {
    if (driveUrl.trim()) {
      onUpdateGoogleDrive?.(project.id, driveUrl.trim());
    }
    setShowDriveModal(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project);
  };

  // ACTION: Review - Send for client validation
  const handleReviewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReviewModal(true);
  };

  const handleConfirmReview = () => {
    onUpdateStatus?.(project.id, 'review');
    onReview?.(project);
    setShowReviewModal(false);
  };

  // ACTION: Complete - Finalize project
  const handleCompleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowCompleteModal(true);
  };

  const handleConfirmComplete = () => {
    onUpdateStatus?.(project.id, 'done');
    onComplete?.(project);
    setShowCompleteModal(false);
  };

  // ACTION: Deliverable - Show deliverables
  const handleDeliverableClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Initialize form with project name
    setDeliverableForm(prev => ({ ...prev, name: project.name }));
    setShowDeliverableModal(true);
  };

  // Handle deliverable form field change
  const handleDeliverableFieldChange = (field: string, value: string | number) => {
    setDeliverableForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle create deliverable
  const handleCreateDeliverable = async () => {
    if (!deliverableForm.name.trim()) return;

    setIsAddingDeliverable(true);
    try {
      // Build name with version (e.g., "Project Name v1.0")
      const nameWithVersion = deliverableForm.version
        ? `${deliverableForm.name} v${deliverableForm.version}`
        : deliverableForm.name;

      await createDeliverable.mutateAsync({
        projectId: project.id,
        name: nameWithVersion,
        type: deliverableForm.type,
        status: deliverableForm.status,
        // Pass these for metadata in description
        count: deliverableForm.count,
        bonusCount: deliverableForm.bonusCount,
        externalUrl: deliverableForm.externalUrl || null,
        miroUrl: deliverableForm.miroUrl || null,
      });

      // Reset form but keep project name
      setDeliverableForm({ ...initialDeliverableForm, name: project.name });
    } catch (error) {
      logger.error('Failed to create deliverable', error);
    } finally {
      setIsAddingDeliverable(false);
    }
  };

  // ACTION: Stage - Create new stage
  const handleStageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStageModal(true);
  };

  const handleConfirmStage = () => {
    onCreateStage?.(project);
    setShowStageModal(false);
  };

  // ACTION: Assign - Assign designers
  const handleAssignClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAssignModal(true);
  };

  const handleToggleDesigner = (designerId: string) => {
    setSelectedDesigners(prev =>
      prev.includes(designerId)
        ? prev.filter(id => id !== designerId)
        : [...prev, designerId]
    );
  };

  const handleConfirmAssign = () => {
    onAssignDesigner?.(project.id, selectedDesigners);
    setShowAssignModal(false);
  };

  // ACTION: Status - Open status modal
  const handleStatusClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenStatusModal?.();
  };

  // ACTION: Archive - Archive project
  const handleArchiveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowArchiveModal(true);
  };

  const handleConfirmArchive = () => {
    onArchive?.(project, archiveReason);
    setShowArchiveModal(false);
    setArchiveReason('');
  };

  // CLIENT ACTIONS: Approve (reviewed) - sends back to in_progress
  const handleClientApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClientApproveModal(true);
  };

  const handleConfirmClientApprove = () => {
    onUpdateStatus?.(project.id, 'in_progress', { markAsReviewed: true });
    setShowClientApproveModal(false);
  };

  // CLIENT ACTIONS: Move to Critical
  const handleClientCriticalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClientCriticalModal(true);
  };

  const handleConfirmClientCritical = () => {
    onUpdateStatus?.(project.id, 'critical');
    setShowClientCriticalModal(false);
  };

  // Deliverable CRUD handlers
  const handleEditDeliverable = (d: Deliverable) => {
    setDeliverableForm({
      name: d.name,
      type: d.type as DeliverableType,
      version: '1.0',
      count: d.count || 1,
      bonusCount: d.bonusCount || 0,
      hoursSpent: d.hoursSpent || 0,
      status: d.status as DeliverableStatus,
      notes: d.notes || '',
      externalUrl: d.externalUrl || '',
      miroUrl: d.miroUrl || '',
    });
    setEditingDeliverable(d);
  };

  const handleSaveDeliverable = async () => {
    if (!editingDeliverable) return;

    try {
      await updateDeliverable.mutateAsync({
        id: editingDeliverable.id,
        input: {
          name: deliverableForm.name,
          type: deliverableForm.type,
          count: deliverableForm.count,
          bonusCount: deliverableForm.bonusCount,
          status: deliverableForm.status,
          externalUrl: deliverableForm.externalUrl || null,
          miroUrl: deliverableForm.miroUrl || null,
        },
      });
      setEditingDeliverable(null);
      setDeliverableForm(initialDeliverableForm);
    } catch (error) {
      logger.error('Failed to update deliverable', error);
    }
  };

  const handleDeleteDeliverable = async () => {
    if (!deletingDeliverable) return;

    try {
      await deleteDeliverable.mutateAsync(deletingDeliverable.id);
      setDeletingDeliverable(null);
    } catch (error) {
      logger.error('Failed to delete deliverable', error);
    }
  };

  return (
    <article className={`${styles.card} ${isSelected ? styles.selected : ''}`} data-project-id={project.id}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.badges}>
          {/* Reviewed badge - shows first when client has reviewed */}
          {project.wasReviewed && (
            <Badge
              variant="neutral"
              size="sm"
              style={{
                backgroundColor: '#8B5CF6',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                letterSpacing: '0.5px',
              }}
            >
              REVIEWED
            </Badge>
          )}
          {/* Project Type badge */}
          {(() => {
            const projectType = getProjectType(project);
            return projectType ? (
              <Badge
                variant="neutral"
                size="sm"
                style={{ backgroundColor: projectType.color, color: '#fff', border: 'none' }}
              >
                {projectType.label.toUpperCase()}
              </Badge>
            ) : null;
          })()}
          {/* Status badge */}
          <Badge variant={statusVariant} size="sm">{statusColumn.label}</Badge>
          {/* Priority badge */}
          {priority && (
            <Badge
              variant="neutral"
              size="sm"
              style={{ backgroundColor: priority.color, color: '#fff', border: 'none' }}
            >
              {priority.label}
            </Badge>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className={styles.title}>{project.name}</h3>

      {/* Client */}
      {project.client && (
        <div className={styles.clientRow}>
          <ClientIcon />
          <span className={styles.clientName}>{project.client.name}</span>
        </div>
      )}

      {/* Progress Bar */}
      <div className={styles.progressSection}>
        <span className={styles.progressLabel}>Progress</span>
        <span className={styles.progressValue}>{progress}%</span>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <PackageIcon />
          <span className={styles.statValue}>{deliverables.length || project.deliverablesCount}</span>
          <span className={styles.statLabel}>DELIVERABLES</span>
        </div>
        <div className={`${styles.stat} ${daysInfo?.isOverdue && project.status !== 'done' ? styles.overdue : ''} ${project.status === 'done' ? styles.completed : ''}`}>
          {project.status === 'done' ? (
            <>
              <CheckIcon />
              <span className={styles.statLabel}>COMPLETED</span>
            </>
          ) : (
            <>
              <CalendarIcon />
              <span className={styles.statValue}>{daysInfo ? (daysInfo.isOverdue ? `-${daysInfo.text.match(/\d+/)?.[0] || 0}` : daysInfo.text.match(/\d+/)?.[0] || '—') : '—'}</span>
              <span className={styles.statLabel}>{daysInfo?.isOverdue ? 'OVERDUE' : 'DAYS LEFT'}</span>
            </>
          )}
        </div>
      </div>

      {/* Asset Totals with expandable deliverables */}
      {(assetTotals.totalAssets > 0 || deliverables.length > 0) && (
        <div className={styles.assetsSection}>
          <button
            className={styles.assetsToggle}
            onClick={(e) => { e.stopPropagation(); setShowDeliverables(!showDeliverables); }}
          >
            <span className={styles.assetsInfo}>
              <span className={styles.assetsCount}>{assetTotals.totalAssets} assets</span>
              {assetTotals.totalBonus > 0 && (
                <span className={styles.bonusCount}>+{assetTotals.totalBonus} bonus</span>
              )}
            </span>
            <ChevronIcon isOpen={showDeliverables} />
          </button>

          {/* Expandable deliverables list */}
          {showDeliverables && deliverables.length > 0 && (
            <div className={styles.deliverablesExpanded}>
              {deliverables.map((d) => (
                <div key={d.id} className={styles.deliverableItem}>
                  <div className={styles.deliverableHeader}>
                    <span className={styles.deliverableName}>{d.name}</span>
                    {d.type && d.type !== 'other' && (
                      <span className={styles.deliverableType}>{d.type}</span>
                    )}
                  </div>
                  <div className={styles.deliverableDetails}>
                    <span className={styles.deliverableDetail}>
                      {d.count}x{d.bonusCount > 0 && <span className={styles.bonusSmall}> +{d.bonusCount}</span>}
                    </span>
                    <span className={`${styles.deliverableStatus} ${styles[`status_${d.status}`]}`}>
                      {d.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className={styles.deliverableActions}>
                    {d.externalUrl && (
                      <button
                        className={styles.deliverableLink}
                        onClick={(e) => { e.stopPropagation(); window.open(d.externalUrl!, '_blank'); }}
                        title="Link"
                      >
                        <ExternalLinkIcon />
                      </button>
                    )}
                    {d.miroUrl && (
                      <button
                        className={styles.deliverableLink}
                        onClick={(e) => { e.stopPropagation(); window.open(d.miroUrl!, '_blank'); }}
                        title="Miro"
                      >
                        <BoardIcon />
                      </button>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          className={styles.deliverableEdit}
                          onClick={(e) => { e.stopPropagation(); handleEditDeliverable(d); }}
                          title="Edit"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          className={styles.deliverableDelete}
                          onClick={(e) => { e.stopPropagation(); setDeletingDeliverable(d); }}
                          title="Delete"
                        >
                          <TrashIcon />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className={styles.quickActions}>
        <button className={styles.actionBtn} onClick={handleViewDetails}>
          <EyeIcon />
          <span>View Details</span>
        </button>
        <button className={styles.actionBtn} onClick={handleViewBoard}>
          <BoardIcon />
          <span>View Board</span>
        </button>
        {/* Google Drive - Admin always sees it, clients only if link exists */}
        {(isAdmin || project.googleDriveUrl) && (
          <button
            className={`${styles.actionBtnIcon} ${project.googleDriveUrl ? styles.hasLink : ''}`}
            onClick={handleGoogleDrive}
            title={project.googleDriveUrl ? 'Open Google Drive' : 'Add Google Drive link'}
          >
            <DriveIcon />
          </button>
        )}
      </div>

      {/* Expanded Section */}
      {isExpanded && (
        <div className={styles.expanded}>
          {/* Goals & Objectives */}
          {project.briefing?.goals && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>GOALS & OBJECTIVES</h4>
              <p className={styles.sectionText}>{project.briefing.goals}</p>
            </div>
          )}

          {/* Description - only show if no briefing data available, parse markdown sections */}
          {project.description && !project.briefing?.projectOverview && !project.briefing?.goals && (
            <>
              {project.description.split(/\n##\s+/).filter(Boolean).map((section, idx) => {
                const lines = section.trim().split('\n');
                const title = lines[0]?.replace(/^#+\s*/, '').trim() || '';
                const content = lines.slice(1).join('\n').trim();
                if (!title || !content || content === 'Not specified') return null;
                return (
                  <div key={idx} className={styles.section}>
                    <h4 className={styles.sectionTitle}>{title.toUpperCase()}</h4>
                    <p className={styles.sectionText}>{content}</p>
                  </div>
                );
              })}
            </>
          )}

          {/* Project Overview */}
          {project.briefing?.projectOverview && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>PROJECT OVERVIEW</h4>
              <p className={styles.sectionText}>{project.briefing.projectOverview}</p>
            </div>
          )}

          {/* Target Audience */}
          {project.briefing?.targetAudience && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>TARGET AUDIENCE</h4>
              <p className={styles.sectionText}>{project.briefing.targetAudience}</p>
            </div>
          )}

          {/* Deliverables Required */}
          {project.briefing?.deliverables && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>DELIVERABLES REQUIRED</h4>
              <p className={styles.sectionText}>{project.briefing.deliverables}</p>
            </div>
          )}

          {/* Timeline Phases */}
          {project.briefing?.timeline && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>TIMELINE PHASES</h4>
              <p className={styles.sectionText}>{project.briefing.timeline}</p>
            </div>
          )}

          {/* Final Messaging */}
          {project.briefing?.finalMessaging && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>FINAL MESSAGING / COPY</h4>
              <p className={styles.sectionText}>{project.briefing.finalMessaging}</p>
            </div>
          )}

          {/* Resource Links */}
          {project.briefing?.resourceLinks && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>RESOURCE LINKS / ASSETS</h4>
              <p className={styles.sectionText}>{project.briefing.resourceLinks}</p>
            </div>
          )}

          {/* Inspirations */}
          {project.briefing?.inspirations && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>INSPIRATIONS / REFERENCES</h4>
              <p className={styles.sectionText}>{project.briefing.inspirations}</p>
            </div>
          )}

          {/* Style Notes */}
          {project.briefing?.styleNotes && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>STYLE / DESIGN NOTES</h4>
              <p className={styles.sectionText}>{project.briefing.styleNotes}</p>
            </div>
          )}

          {/* Additional Notes */}
          {project.briefing?.additionalNotes && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>ADDITIONAL NOTES</h4>
              <p className={styles.sectionText}>{project.briefing.additionalNotes}</p>
            </div>
          )}

          {/* Designers */}
          {project.designers.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>TEAM</h4>
              <div className={styles.designersList}>
                {project.designers.map((designer) => (
                  <div key={designer.id} className={styles.designerItem}>
                    <div className={styles.designerAvatar}>
                      {designer.avatarUrl ? (
                        <img src={designer.avatarUrl} alt={designer.name} />
                      ) : (
                        <span>{designer.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span>{designer.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className={styles.adminActions}>
              <h4 className={styles.actionsTitle}>ACTIONS</h4>
              <div className={styles.actionsGrid}>
                {/* 1. Review */}
                <button className={styles.adminBtn} onClick={handleReviewClick}>
                  <div className={styles.adminBtnIcon}><StarIcon /></div>
                  <span>Review</span>
                </button>

                {/* 2. Complete */}
                <button className={`${styles.adminBtn} ${styles.success}`} onClick={handleCompleteClick}>
                  <div className={styles.adminBtnIcon}><CheckIcon /></div>
                  <span>Complete</span>
                </button>

                {/* 3. Edit */}
                <button className={`${styles.adminBtn} ${styles.primary}`} onClick={handleEditClick}>
                  <div className={styles.adminBtnIcon}><EditIcon /></div>
                  <span>Edit</span>
                </button>

                {/* 4. Deliverable */}
                <button className={styles.adminBtn} onClick={handleDeliverableClick}>
                  <div className={styles.adminBtnIcon}><FileIcon /></div>
                  <span>Deliverable</span>
                </button>

                {/* 5. Stage */}
                <button className={styles.adminBtn} onClick={handleStageClick}>
                  <div className={styles.adminBtnIcon}><PlusIcon /></div>
                  <span>Stage</span>
                </button>

                {/* 6. Assign */}
                <button className={styles.adminBtn} onClick={handleAssignClick}>
                  <div className={styles.adminBtnIcon}><UsersIcon /></div>
                  <span>Assign</span>
                </button>

                {/* 7. Status */}
                <button className={styles.adminBtn} onClick={handleStatusClick}>
                  <div className={styles.adminBtnIcon}><TagIcon /></div>
                  <span>Status</span>
                </button>

                {/* 8. Archive */}
                <button className={`${styles.adminBtn} ${styles.danger}`} onClick={handleArchiveClick}>
                  <div className={styles.adminBtnIcon}><ArchiveIcon /></div>
                  <span>Archive</span>
                </button>
              </div>
            </div>
          )}

          {/* Client Actions - Only visible for the ASSIGNED client */}
          {isAssignedClient && (
            <div className={styles.adminActions}>
              <h4 className={styles.actionsTitle}>YOUR ACTIONS</h4>
              <div className={styles.actionsGrid}>
                {/* Stage - always available for assigned client */}
                <button className={styles.adminBtn} onClick={handleStageClick}>
                  <div className={styles.adminBtnIcon}><PlusIcon /></div>
                  <span>Stage</span>
                </button>

                {/* Critical - always available for assigned client */}
                <button className={`${styles.adminBtn} ${styles.danger}`} onClick={handleClientCriticalClick}>
                  <div className={styles.adminBtnIcon}><StarIcon /></div>
                  <span>Critical</span>
                </button>

                {/* Reviewed - ONLY when in REVIEW status */}
                {isInReview && (
                  <button className={`${styles.adminBtn} ${styles.primary}`} onClick={handleClientApproveClick}>
                    <div className={styles.adminBtnIcon}><CheckIcon /></div>
                    <span>Reviewed</span>
                  </button>
                )}

                {/* Complete - ONLY when in REVIEW status */}
                {isInReview && (
                  <button className={`${styles.adminBtn} ${styles.success}`} onClick={handleCompleteClick}>
                    <div className={styles.adminBtnIcon}><CheckIcon /></div>
                    <span>Complete</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* Google Drive URL Modal */}
      <Dialog
        open={showDriveModal}
        onClose={() => setShowDriveModal(false)}
        title="Google Drive"
        description="Paste the Google Drive folder link for this project"
        size="sm"
      >
        <div className={styles.modalContent}>
          <Input
            label="Google Drive URL"
            placeholder="https://drive.google.com/drive/folders/..."
            value={driveUrl}
            onChange={(e) => setDriveUrl(e.target.value)}
          />
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowDriveModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDriveUrl}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Review Modal */}
      <Dialog
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Send for Review"
        description={`Send "${project.name}" for client validation?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalInfo}>
            <p>This will:</p>
            <ul>
              <li>Update status to <strong>Review</strong></li>
              <li>Highlight the card on the client's board</li>
              <li>Client will receive a notification to approve or request changes</li>
            </ul>
          </div>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowReviewModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmReview}>
              Send for Review
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Complete Modal */}
      <Dialog
        open={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Complete Project"
        description={`Mark "${project.name}" as completed?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalInfo}>
            <p>This will:</p>
            <ul>
              <li>Update status to <strong>Completed</strong></li>
              <li>Move card to the Done column</li>
              <li>Lock editing (only admin can reopen)</li>
              <li>Record completion timestamp</li>
            </ul>
          </div>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmComplete}>
              Complete Project
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deliverable Modal - Compact & Minimal */}
      <Dialog
        open={showDeliverableModal}
        onClose={() => setShowDeliverableModal(false)}
        title={project.name}
        description={`${project.client?.name || 'Client'} • ${deliverables.length} deliverables`}
        size="sm"
      >
        <div className={styles.deliverableModalCompact}>
          {/* Type Selection - 2x2 Grid */}
          <div className={styles.deliverableTypeGridCompact}>
            {DELIVERABLE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`${styles.deliverableTypeBtn} ${deliverableForm.type === type.value ? styles.deliverableTypeBtnActive : ''}`}
                onClick={() => handleDeliverableFieldChange('type', type.value)}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Version, Count, Bonus & Status Row */}
          <div className={styles.deliverableCompactRow4}>
            <div className={styles.deliverableCompactField}>
              <label>Version</label>
              <input
                type="text"
                placeholder="1.0"
                value={deliverableForm.version}
                onChange={(e) => handleDeliverableFieldChange('version', e.target.value)}
              />
            </div>
            <div className={styles.deliverableCompactField}>
              <label>Assets</label>
              <input
                type="number"
                min="1"
                value={deliverableForm.count}
                onChange={(e) => handleDeliverableFieldChange('count', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className={styles.deliverableCompactField}>
              <label>Bonus</label>
              <input
                type="number"
                min="0"
                value={deliverableForm.bonusCount}
                onChange={(e) => handleDeliverableFieldChange('bonusCount', parseInt(e.target.value) || 0)}
              />
            </div>
            <div className={styles.deliverableCompactField}>
              <label>Status</label>
              <select
                value={deliverableForm.status}
                onChange={(e) => handleDeliverableFieldChange('status', e.target.value)}
              >
                {DELIVERABLE_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Links Row */}
          <div className={styles.deliverableLinksRow}>
            <div className={styles.deliverableLinkField}>
              <ExternalLinkIcon />
              <input
                type="url"
                placeholder="External link (Drive, Figma...)"
                value={deliverableForm.externalUrl}
                onChange={(e) => handleDeliverableFieldChange('externalUrl', e.target.value)}
              />
            </div>
            <div className={styles.deliverableLinkField}>
              <BoardIcon />
              <input
                type="text"
                placeholder="Miro frame URL"
                value={deliverableForm.miroUrl}
                onChange={(e) => handleDeliverableFieldChange('miroUrl', e.target.value)}
              />
            </div>
          </div>

          {/* Existing Deliverables - Compact List */}
          {deliverables.length > 0 && (
            <div className={styles.deliverableListCompact}>
              {deliverables.slice(0, 3).map((d) => (
                <div key={d.id} className={styles.deliverableItemCompact}>
                  <span>{d.name}</span>
                  <div className={styles.deliverableItemLinks}>
                    {d.miroUrl && (
                      <button onClick={() => window.open(d.miroUrl!, '_blank')} title="View on Board">
                        <BoardIcon />
                      </button>
                    )}
                    {d.externalUrl && (
                      <button onClick={() => window.open(d.externalUrl!, '_blank')} title="External">
                        <ExternalLinkIcon />
                      </button>
                    )}
                  </div>
                  <Badge
                    variant={d.status === 'approved' ? 'success' : d.status === 'in_review' ? 'warning' : d.status === 'in_progress' ? 'info' : 'neutral'}
                    size="sm"
                  >
                    {d.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              ))}
              {deliverables.length > 3 && (
                <span className={styles.deliverableMoreText}>+{deliverables.length - 3} more</span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className={styles.deliverableActionsCompact}>
            <Button variant="ghost" size="sm" onClick={() => setShowDeliverableModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateDeliverable}
              disabled={!deliverableForm.name.trim() || isAddingDeliverable}
            >
              {isAddingDeliverable ? 'Adding...' : 'Add Deliverable'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Stage Modal */}
      <Dialog
        open={showStageModal}
        onClose={() => setShowStageModal(false)}
        title="Create New Stage"
        description={`Add a new process stage for "${project.name}"`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalInfo}>
            <p>This will create a new stage frame in the project board:</p>
            <div className={styles.stagePreview}>
              <span className={styles.stageIcon}>🎯</span>
              <span>{project.name} - STAGE {(project.deliverablesCount || 0) + 1}</span>
            </div>
            <p className={styles.stageNote}>
              The stage will be added to the right of existing stages and synced with the Admin panel.
            </p>
          </div>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowStageModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmStage}>
              Create Stage
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Modal */}
      <Dialog
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title="Assign Designers"
        description={`Select designers for "${project.name}"`}
        size="md"
      >
        <div className={styles.modalContent}>
          <div className={styles.designerGrid}>
            {designersWithWorkload.map((designer: { id: string; name: string; email: string; avatarUrl?: string | null; activeProjects: number; inProgressProjects: number }) => (
              <div
                key={designer.id}
                className={`${styles.designerCard} ${selectedDesigners.includes(designer.id) ? styles.selected : ''}`}
                onClick={() => handleToggleDesigner(designer.id)}
              >
                <div className={styles.designerCardAvatar}>
                  {designer.avatarUrl ? (
                    <img src={designer.avatarUrl} alt={designer.name} />
                  ) : (
                    <span>{designer.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className={styles.designerCardInfo}>
                  <span className={styles.designerCardName}>{designer.name}</span>
                  <span className={styles.designerCardEmail}>{designer.email}</span>
                </div>
                <div className={styles.designerCardWorkload}>
                  <div className={styles.workloadItem}>
                    <span className={styles.workloadValue}>{designer.activeProjects}</span>
                    <span className={styles.workloadLabel}>Active</span>
                  </div>
                  <div className={styles.workloadItem}>
                    <span className={styles.workloadValue}>{designer.inProgressProjects}</span>
                    <span className={styles.workloadLabel}>In Progress</span>
                  </div>
                </div>
                {selectedDesigners.includes(designer.id) && (
                  <div className={styles.designerCardCheck}>
                    <CheckIcon />
                  </div>
                )}
              </div>
            ))}
          </div>
          {designersWithWorkload.length === 0 && (
            <p className={styles.emptyText}>No designers available</p>
          )}
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowAssignModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmAssign}>
              Assign ({selectedDesigners.length})
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Archive Modal */}
      <Dialog
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Project"
        description={`Archive "${project.name}"?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalWarning}>
            <p>This will move the project to the archive. Only admins can restore archived projects.</p>
          </div>
          <Input
            label="Reason (optional)"
            placeholder="Why is this project being archived?"
            value={archiveReason}
            onChange={(e) => setArchiveReason(e.target.value)}
          />
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowArchiveModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmArchive}>
              Archive Project
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Approve/Reviewed Modal */}
      <Dialog
        open={showClientApproveModal}
        onClose={() => setShowClientApproveModal(false)}
        title="Mark as Reviewed"
        description={`Send "${project.name}" back to the design team?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalInfo}>
            <p>This will:</p>
            <ul>
              <li>Mark this stage as <strong>reviewed</strong></li>
              <li>Send the project back to <strong>In Progress</strong></li>
              <li>Notify the design team to continue working</li>
            </ul>
          </div>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowClientApproveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmClientApprove}>
              Mark as Reviewed
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Move to Critical Modal */}
      <Dialog
        open={showClientCriticalModal}
        onClose={() => setShowClientCriticalModal(false)}
        title="Move to Critical"
        description={`Mark "${project.name}" as critical priority?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalWarning}>
            <p>This will:</p>
            <ul>
              <li>Mark this project as <strong>CRITICAL</strong></li>
              <li>Alert the design team immediately</li>
              <li>Move the card to the Critical column</li>
            </ul>
            <p style={{ marginTop: '12px', fontWeight: 500 }}>Use this only for urgent issues that need immediate attention.</p>
          </div>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowClientCriticalModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmClientCritical}>
              Move to Critical
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Deliverable Modal */}
      <Dialog
        open={!!editingDeliverable}
        onClose={() => { setEditingDeliverable(null); setDeliverableForm(initialDeliverableForm); }}
        title="Edit Deliverable"
        size="md"
      >
        <div className={styles.modalContent}>
          <div className={styles.formGrid}>
            <Input
              label="Name"
              value={deliverableForm.name}
              onChange={(e) => setDeliverableForm(prev => ({ ...prev, name: e.target.value }))}
            />
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Type</label>
                <select
                  className={styles.formSelect}
                  value={deliverableForm.type}
                  onChange={(e) => setDeliverableForm(prev => ({ ...prev, type: e.target.value as DeliverableType }))}
                >
                  {DELIVERABLE_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Status</label>
                <select
                  className={styles.formSelect}
                  value={deliverableForm.status}
                  onChange={(e) => setDeliverableForm(prev => ({ ...prev, status: e.target.value as DeliverableStatus }))}
                >
                  {DELIVERABLE_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formRow}>
              <Input
                label="Count"
                type="number"
                value={String(deliverableForm.count)}
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
              />
              <Input
                label="Bonus"
                type="number"
                value={String(deliverableForm.bonusCount)}
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, bonusCount: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <Input
              label="External URL"
              value={deliverableForm.externalUrl}
              onChange={(e) => setDeliverableForm(prev => ({ ...prev, externalUrl: e.target.value }))}
              placeholder="https://..."
            />
            <Input
              label="Miro URL"
              value={deliverableForm.miroUrl}
              onChange={(e) => setDeliverableForm(prev => ({ ...prev, miroUrl: e.target.value }))}
              placeholder="https://miro.com/..."
            />
          </div>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => { setEditingDeliverable(null); setDeliverableForm(initialDeliverableForm); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveDeliverable} disabled={updateDeliverable.isPending}>
              {updateDeliverable.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Deliverable Modal */}
      <Dialog
        open={!!deletingDeliverable}
        onClose={() => setDeletingDeliverable(null)}
        title="Delete Deliverable"
        description={`Are you sure you want to delete "${deletingDeliverable?.name}"?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <p className={styles.deleteWarning}>This action cannot be undone.</p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setDeletingDeliverable(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteDeliverable} disabled={deleteDeliverable.isPending}>
              {deleteDeliverable.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </article>
  );
}
