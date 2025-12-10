import { useState, useMemo, memo, useRef, useCallback } from 'react';
import { Badge, Dialog, Input, Button } from '@shared/ui';
import {
  ClientIcon,
  CalendarIcon,
  PackageIcon,
  EyeIcon,
  BoardIcon,
  CheckIcon,
  EditIcon,
  FileIcon,
  UsersIcon,
  ArchiveIcon,
  StarIcon,
  PlusIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
  TrashIcon,
} from '@shared/ui/Icons';
import { useAuth } from '@features/auth';
import { useDeliverables, useCreateDeliverable, useUpdateDeliverable, useDeleteDeliverable } from '@features/deliverables/hooks';
import type { Deliverable, DeliverableType, DeliverableStatus } from '@features/deliverables/domain/deliverable.types';
import { DELIVERABLE_TYPES, DELIVERABLE_STATUSES, DEFAULT_DELIVERABLE_FORM } from '@features/deliverables/domain/deliverable.constants';
import { useUsers } from '@features/admin/hooks/useUsers';
import { useProjects } from '../../hooks/useProjects';
import { createLogger } from '@shared/lib/logger';
import { getStatusColumn, getStatusProgress } from '@shared/lib/timelineStatus';
import { PRIORITY_CONFIG, BADGE_COLORS } from '@features/boards/services/constants/colors.constants';
import { getProjectType } from '@features/boards/services/miroHelpers';
import type { ProjectCardProps } from './ProjectCard.types';
import styles from './ProjectCard.module.css';

const logger = createLogger('ProjectCard');

// getProjectType is now imported from miroHelpers

// Google Drive icon uses image (not SVG) for brand consistency
const DriveIconImg = ({ hasLink }: { hasLink?: boolean }) => (
  <img
    src="/googledrive-icon.png"
    alt="Google Drive"
    width="18"
    height="18"
    style={{ opacity: hasLink ? 1 : 0.4 }}
  />
);

/**
 * ProjectCard - Displays a project with expandable details and admin actions
 * Memoized to prevent unnecessary re-renders in project lists
 */
export const ProjectCard = memo(function ProjectCard({
  project,
  onEdit,
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
  isSelected = false,
}: ProjectCardProps) {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(isSelected);
  const [showDeliverables, setShowDeliverables] = useState(false);

  // Click handling for single vs double click
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const clickCountRef = useRef(0);

  // Modal states
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showClientRequestChangesModal, setShowClientRequestChangesModal] = useState(false);
  const [showClientApproveModal, setShowClientApproveModal] = useState(false);
  const [showClientCriticalModal, setShowClientCriticalModal] = useState(false);
  // Form states
  const [driveUrl, setDriveUrl] = useState(project.googleDriveUrl || '');
  const [archiveReason, setArchiveReason] = useState('');
  const [selectedDesigners, setSelectedDesigners] = useState<string[]>(
    project.designers.map(d => d.id)
  );

  // Deliverable form state
  const [deliverableForm, setDeliverableForm] = useState(DEFAULT_DELIVERABLE_FORM);
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
      // In progress = urgent, in_progress, or overdue
      const inProgressProjects = designerProjects.filter(p =>
        ['urgent', 'in_progress', 'overdue'].includes(p.status)
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
  const isDone = project.status === 'done';
  const isArchived = project.archivedAt !== null;
  // Check if current user is the assigned client for this project
  const isAssignedClient = isClient && project.clientId === user?.id;

  // Get status column info (status is now direct from DB, uses color directly)
  const statusColumn = getStatusColumn(project.status);

  // Debug: log status
  logger.debug('Status mapping', { name: project.name, dbStatus: project.status, badge: statusColumn.label });

  const priority = PRIORITY_CONFIG[project.priority];

  // Calculate days left/overdue - memoized to avoid recalculation on every render
  const daysInfo = useMemo(() => {
    if (!project.dueDate) return null;
    // If due date is not approved, show "Em análise"
    if (!project.dueDateApproved) {
      return { text: 'Em análise', isOverdue: false, isPending: true };
    }
    const due = new Date(project.dueDate);
    const now = new Date();
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: `${Math.abs(diff)} days overdue`, isOverdue: true, isPending: false };
    if (diff === 0) return { text: 'Due today', isOverdue: false, isPending: false };
    return { text: `${diff} days left`, isOverdue: false, isPending: false };
  }, [project.dueDate, project.dueDateApproved]);

  // Calculate progress based on project status using centralized function - memoized
  const progress = useMemo(() => getStatusProgress(project.status), [project.status]);

  // Event handlers

  // Handle card click: single click = zoom to board, double click = expand details
  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't handle clicks on buttons, inputs, or other interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('a') ||
      target.closest('[role="button"]')
    ) {
      return;
    }

    clickCountRef.current += 1;

    if (clickCountRef.current === 1) {
      // Wait to see if it's a double click
      clickTimerRef.current = setTimeout(() => {
        // Single click - zoom to project on board
        if (clickCountRef.current === 1) {
          onCardClick?.(project);
        }
        clickCountRef.current = 0;
      }, 250);
    } else if (clickCountRef.current === 2) {
      // Double click - expand/collapse details
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      clickCountRef.current = 0;
      setIsExpanded(!isExpanded);
    }
  }, [project, onCardClick, isExpanded]);

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleViewBoard = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Try to zoom to project frame on Miro board
    if (typeof miro !== 'undefined') {
      try {
        // First try to find by miroBoardId (stored Miro item ID)
        if (project.miroBoardId) {
          try {
            const itemById = await miro.board.getById(project.miroBoardId);
            if (itemById) {
              await miro.board.viewport.zoomTo([itemById]);
              return;
            }
          } catch {
            // Item not found by ID, continue with other methods
          }
        }

        // Try to find BRIEFING frame by project NAME in title
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const frames = await miro.board.get({ type: 'frame' }) as any[];
        const briefingFrame = frames.find((frame) =>
          frame.title?.includes(project.name) && frame.title?.includes('BRIEFING')
        );

        if (briefingFrame) {
          await miro.board.viewport.zoomTo([briefingFrame]);
          return;
        }

        // Try to find any frame with project name
        const projectFrame = frames.find((frame) =>
          frame.title?.includes(project.name)
        );

        if (projectFrame) {
          await miro.board.viewport.zoomTo([projectFrame]);
          return;
        }

        // Try to find timeline card by projectId in description
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cards = await miro.board.get({ type: 'card' }) as any[];
        const projectCard = cards.find((card) =>
          card.description?.includes(`projectId:${project.id}`)
        );

        if (projectCard) {
          await miro.board.viewport.zoomTo([projectCard]);
          return;
        }

        logger.debug('Could not find project on board', { name: project.name, id: project.id });
      } catch (err) {
        logger.debug('Error searching for project on board', err);
      }
    }

    // Fall back to callback
    if (onViewBoard) {
      onViewBoard(project);
    }
  };

  /**
   * Zoom to a Miro item by URL or ID
   * Extracts item ID from Miro URL and zooms to it
   */
  const zoomToMiroItem = async (urlOrId: string): Promise<boolean> => {
    if (typeof miro === 'undefined') return false;

    try {
      // Extract item ID from Miro URL if it's a URL
      // Miro URLs look like: https://miro.com/app/board/xxx/?moveToWidget=ID
      // or just an ID directly
      let itemId = urlOrId;

      if (urlOrId.includes('miro.com')) {
        // Try to extract moveToWidget parameter
        const url = new URL(urlOrId);
        const moveToWidget = url.searchParams.get('moveToWidget');
        if (moveToWidget) {
          itemId = moveToWidget;
        } else {
          // Can't extract ID from URL, return false
          return false;
        }
      }

      // Try to get the item and zoom to it
      const item = await miro.board.getById(itemId);
      if (item) {
        await miro.board.viewport.zoomTo([item]);
        return true;
      }
    } catch (err) {
      logger.debug('Could not zoom to Miro item', err);
    }

    return false;
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
    // Initialize form with project name and auto-calculated version
    const nextVersion = String(deliverables.length + 1);
    setDeliverableForm(prev => ({ ...prev, name: project.name, version: nextVersion }));
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
      setDeliverableForm({ ...DEFAULT_DELIVERABLE_FORM, name: project.name });
    } catch (error) {
      logger.error('Failed to create deliverable', error);
    } finally {
      setIsAddingDeliverable(false);
    }
  };

  // ACTION: Version - Create new version
  const handleVersionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVersionModal(true);
  };

  const handleConfirmVersion = () => {
    onCreateVersion?.(project);
    setShowVersionModal(false);
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

  // CLIENT ACTIONS: Request Changes - sends back to in_progress for more work
  const handleClientRequestChangesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClientRequestChangesModal(true);
  };

  const handleConfirmClientRequestChanges = () => {
    // Send back to in_progress with wasReviewed flag (indicates client reviewed and wants changes)
    onUpdateStatus?.(project.id, 'in_progress', { markAsReviewed: true });
    setShowClientRequestChangesModal(false);
  };

  // CLIENT ACTIONS: Approve - marks project as approved (stays in review for admin to finalize)
  const handleClientApproveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClientApproveModal(true);
  };

  const handleConfirmClientApprove = () => {
    // Mark as approved - project stays in current status but gets approved flag
    onUpdate?.(project.id, { wasApproved: true });
    setShowClientApproveModal(false);
  };

  // CLIENT ACTIONS: Move to Urgent
  const handleClientCriticalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowClientCriticalModal(true);
  };

  const handleConfirmClientCritical = () => {
    onUpdateStatus?.(project.id, 'urgent');
    setShowClientCriticalModal(false);
  };

  // Admin: Approve pending due date (when project is created with a due date)
  const handleApproveDueDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate?.(project.id, { dueDateApproved: true });
  };

  // Admin: Reject pending due date (clears the due date)
  const handleRejectDueDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate?.(project.id, {
      dueDate: null,
      dueDateApproved: true, // No longer pending since we cleared it
    });
  };

  // Deliverable CRUD handlers
  const handleEditDeliverable = (d: Deliverable) => {
    // Extract version from name (e.g., "Project Name v2" -> "2")
    const versionMatch = d.name.match(/\sv(\d+)$/);
    const version = versionMatch ? versionMatch[1] : '1';
    // Extract base name without version
    const baseName = d.name.replace(/\sv\d+$/, '');

    setDeliverableForm({
      name: baseName,
      type: d.type as DeliverableType,
      version: version || '1',
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
      // Build name with version (e.g., "Project Name v1")
      const nameWithVersion = deliverableForm.version
        ? `${deliverableForm.name} v${deliverableForm.version}`
        : deliverableForm.name;

      await updateDeliverable.mutateAsync({
        id: editingDeliverable.id,
        input: {
          name: nameWithVersion,
          type: deliverableForm.type,
          count: deliverableForm.count,
          bonusCount: deliverableForm.bonusCount,
          status: deliverableForm.status,
          externalUrl: deliverableForm.externalUrl || null,
          miroUrl: deliverableForm.miroUrl || null,
        },
      });
      setEditingDeliverable(null);
      setDeliverableForm(DEFAULT_DELIVERABLE_FORM);
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
    <article
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${isDone ? styles.done : ''}`}
      data-project-id={project.id}
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Header */}
      <div className={styles.header}>
        {/* Review Ready banner - shown to client when project is in review status (hide if already approved) */}
        {isInReview && isClient && !project.wasApproved && (
          <div className={styles.reviewReadyBanner}>
            <span className={styles.reviewReadyText}>★ REVIEW READY</span>
          </div>
        )}
        {/* Approved banner - shown when client has approved (ready for admin to finalize) */}
        {project.wasApproved && !isDone && (
          <div className={styles.approvedBanner}>
            <Badge
              variant="neutral"
              size="sm"
              style={{
                backgroundColor: BADGE_COLORS.SUCCESS,
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                letterSpacing: '0.5px',
                padding: '4px 12px',
              }}
            >
              ✓ CLIENT APPROVED
            </Badge>
          </div>
        )}
        {/* Reviewed badge - shown when client requested changes (hidden when done, in review, or approved) */}
        {project.wasReviewed && !isDone && !isInReview && !project.wasApproved && (
          <div className={styles.reviewedBanner}>
            <Badge
              variant="neutral"
              size="sm"
              style={{
                backgroundColor: BADGE_COLORS.PURPLE,
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                letterSpacing: '0.5px',
                padding: '4px 12px',
              }}
            >
              ✎ CHANGES REQUESTED
            </Badge>
          </div>
        )}
        {/* Archived banner - shown when project is archived */}
        {isArchived && (
          <div className={styles.archivedBanner}>
            <Badge
              variant="neutral"
              size="sm"
              style={{
                backgroundColor: BADGE_COLORS.NEUTRAL,
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                letterSpacing: '0.5px',
                padding: '4px 12px',
              }}
            >
              📦 ARCHIVED
            </Badge>
          </div>
        )}
        {/* Badges row: Priority | Type | Status */}
        <div className={styles.badges}>
          {/* 1. Priority badge */}
          {priority && (
            <Badge
              variant="neutral"
              size="sm"
              style={{ backgroundColor: priority.color, color: '#fff', border: 'none' }}
            >
              {priority.label}
            </Badge>
          )}
          {/* 2. Project Type badge */}
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
          {/* 3. Status badge - uses exact color from timeline config, or ARCHIVED if archived */}
          <Badge
            size="sm"
            style={{
              backgroundColor: isArchived ? BADGE_COLORS.NEUTRAL : statusColumn.color,
              color: '#fff',
              border: 'none'
            }}
          >
            {isArchived ? 'ARCHIVED' : statusColumn.label}
          </Badge>
        </div>
      </div>

      {/* Title */}
      <h3 className={styles.title}>{project.name}</h3>

      {/* Client */}
      {project.client && (
        <div className={styles.clientRow}>
          <ClientIcon size={14} />
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
        <div className={styles.statDeliverables}>
          {deliverables.length > 0 ? (
            <button
              className={styles.statClickable}
              onClick={(e) => { e.stopPropagation(); setShowDeliverables(!showDeliverables); }}
            >
              <PackageIcon />
              <span className={styles.statValue}>{deliverables.length}</span>
              <span className={styles.statLabel}>DELIVERABLES</span>
              <ChevronDownIcon isOpen={showDeliverables} />
            </button>
          ) : (
            <div className={styles.stat}>
              <PackageIcon />
              <span className={styles.statValue}>{project.deliverablesCount || 0}</span>
              <span className={styles.statLabel}>DELIVERABLES</span>
            </div>
          )}
          {assetTotals.totalAssets > 0 && (
            <div className={styles.assetsRow}>
              <span className={styles.assetsCount}>{assetTotals.totalAssets} assets</span>
            </div>
          )}
        </div>
        <div className={`${styles.stat} ${daysInfo?.isOverdue && project.status !== 'done' ? styles.overdue : ''} ${project.status === 'done' ? styles.completed : ''} ${daysInfo?.isPending ? styles.isPending : ''}`}>
          {project.status === 'done' ? (
            <>
              <CheckIcon />
              <span className={styles.statLabel}>COMPLETED</span>
            </>
          ) : daysInfo?.isPending ? (
            <>
              <CalendarIcon size={14} />
              <div className={styles.pendingDateInfo}>
                <span className={styles.pendingLabel}>PENDING</span>
                <span className={styles.pendingDate}>
                  {project.dueDate ? new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                </span>
              </div>
              {isAdmin && (
                <div className={styles.dueDateApprovalButtons}>
                  <button
                    className={styles.approveSmall}
                    onClick={handleApproveDueDate}
                    title="Approve date"
                  >
                    ✓
                  </button>
                  <button
                    className={styles.rejectSmall}
                    onClick={handleRejectDueDate}
                    title="Reject date"
                  >
                    ✕
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <CalendarIcon size={14} />
              <span className={styles.statValue}>
                {daysInfo
                  ? (daysInfo.isOverdue
                      ? daysInfo.text.match(/\d+/)?.[0] || '0'
                      : daysInfo.text.match(/\d+/)?.[0] || '—')
                  : '—'}
              </span>
              <span className={styles.statLabel}>{daysInfo?.isOverdue ? 'OVERDUE' : 'DAYS LEFT'}</span>
            </>
          )}
        </div>
      </div>

      
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
                    onClick={async (e) => {
                      e.stopPropagation();
                      const zoomed = await zoomToMiroItem(d.miroUrl!);
                      if (!zoomed) {
                        window.open(d.miroUrl!, '_blank');
                      }
                    }}
                    title="View on Board"
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
                      <EditIcon size={12} />
                    </button>
                    <button
                      className={styles.deliverableDelete}
                      onClick={(e) => { e.stopPropagation(); setDeletingDeliverable(d); }}
                      title="Delete"
                    >
                      <TrashIcon size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
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
            <DriveIconImg hasLink={!!project.googleDriveUrl} />
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

          {/* Project Overview - show "Needs attention" if empty */}
          {!project.briefing?.projectOverview && !project.briefing?.goals && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>PROJECT OVERVIEW</h4>
              <p className={`${styles.sectionText} ${styles.needsAttention}`}>Needs attention</p>
            </div>
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

                {/* 5. Version */}
                <button className={styles.adminBtn} onClick={handleVersionClick}>
                  <div className={styles.adminBtnIcon}><PlusIcon /></div>
                  <span>Version</span>
                </button>

                {/* 6. Assign */}
                <button className={styles.adminBtn} onClick={handleAssignClick}>
                  <div className={styles.adminBtnIcon}><UsersIcon /></div>
                  <span>Assign</span>
                </button>

                {/* 7. Archive */}
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
                {/* Version - available for assigned client, hidden when Done */}
                {!isDone && (
                  <button className={styles.adminBtn} onClick={handleVersionClick}>
                    <div className={styles.adminBtnIcon}><PlusIcon /></div>
                    <span>Version</span>
                  </button>
                )}

                {/* Urgent - available for assigned client, hidden when Done */}
                {!isDone && (
                  <button className={`${styles.adminBtn} ${styles.danger}`} onClick={handleClientCriticalClick}>
                    <div className={styles.adminBtnIcon}><StarIcon /></div>
                    <span>Urgent</span>
                  </button>
                )}

                {/* Request Changes - ONLY when in REVIEW status (sends back to in_progress) */}
                {isInReview && (
                  <button className={`${styles.adminBtn} ${styles.warning}`} onClick={handleClientRequestChangesClick}>
                    <div className={styles.adminBtnIcon}><EditIcon /></div>
                    <span>Request Changes</span>
                  </button>
                )}

                {/* Approve - ONLY when in REVIEW status (marks as approved for admin to finalize) */}
                {isInReview && (
                  <button className={`${styles.adminBtn} ${styles.success}`} onClick={handleClientApproveClick}>
                    <div className={styles.adminBtnIcon}><CheckIcon /></div>
                    <span>Approve</span>
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
        description={`The client will be notified to review and approve "${project.name}".`}
        size="sm"
      >
        <div className={styles.modalContent}>
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
        description={`Finalize "${project.name}"? The project will be moved to Done.`}
        size="sm"
      >
        <div className={styles.modalContent}>
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

          {/* Version (auto), Assets, Bonus & Status Row */}
          <div className={styles.deliverableCompactRow4}>
            <div className={styles.deliverableCompactField}>
              <label>Version</label>
              <input
                type="text"
                value={`v${deliverableForm.version}`}
                disabled
                className={styles.disabledInput}
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
                      <button
                        onClick={async () => {
                          const zoomed = await zoomToMiroItem(d.miroUrl!);
                          if (!zoomed) {
                            window.open(d.miroUrl!, '_blank');
                          }
                        }}
                        title="View on Board"
                      >
                        <BoardIcon />
                      </button>
                    )}
                    {d.externalUrl && (
                      <button onClick={() => window.open(d.externalUrl!, '_blank')} title="External">
                        <ExternalLinkIcon />
                      </button>
                    )}
                  </div>
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

      {/* Version Modal */}
      <Dialog
        open={showVersionModal}
        onClose={() => setShowVersionModal(false)}
        title="New Version"
        description={`Create a new version frame for "${project.name}" on the board?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowVersionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmVersion}>
              Create Version
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
        description={`Move "${project.name}" to the archive?`}
        size="sm"
      >
        <div className={styles.modalContent}>
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
              Archive
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Request Changes Modal */}
      <Dialog
        open={showClientRequestChangesModal}
        onClose={() => setShowClientRequestChangesModal(false)}
        title="Request Changes"
        description={`Send "${project.name}" back to the design team for revisions?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowClientRequestChangesModal(false)}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={handleConfirmClientRequestChanges}>
              Request Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Approve Modal */}
      <Dialog
        open={showClientApproveModal}
        onClose={() => setShowClientApproveModal(false)}
        title="Approve Project"
        description={`Approve "${project.name}"? The team will be notified to finalize the project.`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowClientApproveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmClientApprove}>
              Approve Project
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Move to Urgent Modal */}
      <Dialog
        open={showClientCriticalModal}
        onClose={() => setShowClientCriticalModal(false)}
        title="Move to Urgent"
        description={`Mark "${project.name}" as urgent? The team will be alerted immediately.`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setShowClientCriticalModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmClientCritical}>
              Move to Urgent
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Deliverable Modal - Same layout as create */}
      <Dialog
        open={!!editingDeliverable}
        onClose={() => { setEditingDeliverable(null); setDeliverableForm(DEFAULT_DELIVERABLE_FORM); }}
        title={`Edit: ${editingDeliverable?.name || 'Deliverable'}`}
        size="sm"
      >
        <div className={styles.deliverableModalCompact}>
          {/* Type Selection - Grid */}
          <div className={styles.deliverableTypeGridCompact}>
            {DELIVERABLE_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                className={`${styles.deliverableTypeBtn} ${deliverableForm.type === type.value ? styles.deliverableTypeBtnActive : ''}`}
                onClick={() => setDeliverableForm(prev => ({ ...prev, type: type.value }))}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Version (auto), Assets, Bonus & Status Row */}
          <div className={styles.deliverableCompactRow4}>
            <div className={styles.deliverableCompactField}>
              <label>Version</label>
              <input
                type="text"
                value={`v${deliverableForm.version}`}
                disabled
                className={styles.disabledInput}
              />
            </div>
            <div className={styles.deliverableCompactField}>
              <label>Assets</label>
              <input
                type="number"
                min="1"
                value={deliverableForm.count}
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className={styles.deliverableCompactField}>
              <label>Bonus</label>
              <input
                type="number"
                min="0"
                value={deliverableForm.bonusCount}
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, bonusCount: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className={styles.deliverableCompactField}>
              <label>Status</label>
              <select
                value={deliverableForm.status}
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, status: e.target.value as DeliverableStatus }))}
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
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, externalUrl: e.target.value }))}
              />
            </div>
            <div className={styles.deliverableLinkField}>
              <BoardIcon />
              <input
                type="text"
                placeholder="Miro frame URL"
                value={deliverableForm.miroUrl}
                onChange={(e) => setDeliverableForm(prev => ({ ...prev, miroUrl: e.target.value }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className={styles.deliverableActionsCompact}>
            <Button variant="ghost" size="sm" onClick={() => { setEditingDeliverable(null); setDeliverableForm(DEFAULT_DELIVERABLE_FORM); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveDeliverable}
              disabled={updateDeliverable.isPending}
            >
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
});
