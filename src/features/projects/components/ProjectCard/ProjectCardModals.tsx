/**
 * ProjectCardModals - All dialog modals for project actions
 */

import { memo } from 'react';
import { Dialog, Input, Button } from '@shared/ui';
import {
  ExternalLinkIcon,
  BoardIcon,
  CheckIcon,
} from '@shared/ui/Icons';
import { STATUS_COLUMNS } from '@shared/lib/timelineStatus';
import { PRIORITY_OPTIONS } from '@shared/lib/priorityConfig';
import { DELIVERABLE_TYPES, DELIVERABLE_STATUSES } from '@features/deliverables/domain/deliverable.constants';
import type { Deliverable, DeliverableStatus } from '@features/deliverables/domain/deliverable.types';
import { useProjectCard } from './ProjectCardContext';
import styles from './ProjectCard.module.css';

interface ProjectCardModalsProps {
  deliverables: Deliverable[];
  designersWithWorkload: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    activeProjects: number;
    inProgressProjects: number;
  }>;
  // Handlers
  onSaveDriveUrl: () => void;
  onEditSubmit: () => Promise<void>;
  onConfirmReview: () => void;
  onConfirmComplete: () => void;
  onCreateDeliverable: () => Promise<void>;
  onConfirmVersion: () => void;
  onConfirmAssign: () => void;
  onConfirmArchive: () => void;
  onConfirmClientRequestChanges: () => void;
  onConfirmClientApprove: () => void;
  onConfirmClientCritical: () => void;
  onSaveDeliverable: () => Promise<void>;
  onDeleteDeliverable: () => Promise<void>;
  onToggleDesigner: (designerId: string) => void;
  zoomToMiroItem: (urlOrId: string) => Promise<boolean>;
  // Mutation states
  isUpdatingDeliverable: boolean;
  isDeletingDeliverable: boolean;
}

export const ProjectCardModals = memo(function ProjectCardModals({
  deliverables,
  designersWithWorkload,
  onSaveDriveUrl,
  onEditSubmit,
  onConfirmReview,
  onConfirmComplete,
  onCreateDeliverable,
  onConfirmVersion,
  onConfirmAssign,
  onConfirmArchive,
  onConfirmClientRequestChanges,
  onConfirmClientApprove,
  onConfirmClientCritical,
  onSaveDeliverable,
  onDeleteDeliverable,
  onToggleDesigner,
  zoomToMiroItem,
  isUpdatingDeliverable,
  isDeletingDeliverable,
}: ProjectCardModalsProps) {
  const {
    project,
    modals,
    closeModal,
    setEditingDeliverable,
    setDeletingDeliverable,
    driveUrl,
    setDriveUrl,
    archiveReason,
    setArchiveReason,
    selectedDesigners,
    deliverableForm,
    setDeliverableForm,
    editForm,
    setEditForm,
    isEditLoading,
    isAddingDeliverable,
  } = useProjectCard();

  const handleDeliverableFieldChange = (field: string, value: string | number) => {
    setDeliverableForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      {/* Google Drive URL Modal */}
      <Dialog
        open={modals.drive}
        onClose={() => closeModal('drive')}
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
            <Button variant="ghost" onClick={() => closeModal('drive')}>
              Cancel
            </Button>
            <Button onClick={onSaveDriveUrl}>
              Save
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Project Modal */}
      <Dialog
        open={modals.edit}
        onClose={() => closeModal('edit')}
        title="Edit Project"
        size="sm"
      >
        <div className={styles.editProjectModal}>
          {/* Project Name */}
          <div className={styles.editField}>
            <input
              type="text"
              className={styles.editInputName}
              placeholder="Project name"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              disabled={isEditLoading}
            />
          </div>

          {/* Status Selection */}
          <div className={styles.editChipGroup}>
            <span className={styles.editChipLabel}>Status</span>
            <div className={styles.editChips}>
              {STATUS_COLUMNS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`${styles.editChip} ${editForm.status === option.id ? styles.editChipActive : ''}`}
                  onClick={() => setEditForm(prev => ({ ...prev, status: option.id }))}
                  disabled={isEditLoading}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority Selection */}
          <div className={styles.editChipGroup}>
            <span className={styles.editChipLabel}>Priority</span>
            <div className={styles.editChips}>
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.editChip} ${styles.editChipPriority} ${editForm.priority === option.value ? styles.editChipActive : ''}`}
                  onClick={() => setEditForm(prev => ({ ...prev, priority: option.value }))}
                  disabled={isEditLoading}
                  data-priority={option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Row */}
          <div className={styles.editDatesRow}>
            <div className={styles.editDateField}>
              <span className={styles.editDateLabel}>Start</span>
              <input
                type="date"
                className={styles.editDateInput}
                value={editForm.startDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, startDate: e.target.value }))}
                disabled={isEditLoading}
              />
            </div>
            <div className={styles.editDateSeparator}>→</div>
            <div className={styles.editDateField}>
              <span className={styles.editDateLabel}>Due</span>
              <input
                type="date"
                className={styles.editDateInput}
                value={editForm.dueDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                disabled={isEditLoading}
              />
            </div>
          </div>

          {/* Description */}
          <div className={styles.editField}>
            <textarea
              className={styles.editTextarea}
              placeholder="Description (optional)"
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              disabled={isEditLoading}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className={styles.editActions}>
            <Button variant="ghost" size="sm" onClick={() => closeModal('edit')} disabled={isEditLoading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={onEditSubmit} disabled={isEditLoading || !editForm.name.trim()}>
              {isEditLoading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Review Modal */}
      <Dialog
        open={modals.review}
        onClose={() => closeModal('review')}
        title="Send for Review"
        description={`The client will be notified to review and approve "${project.name}".`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => closeModal('review')}>
              Cancel
            </Button>
            <Button onClick={onConfirmReview}>
              Send for Review
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Complete Modal */}
      <Dialog
        open={modals.complete}
        onClose={() => closeModal('complete')}
        title="Complete Project"
        description={`Finalize "${project.name}"? The project will be moved to Done.`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => closeModal('complete')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirmComplete}>
              Complete Project
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Deliverable Modal - Compact & Minimal */}
      <Dialog
        open={modals.deliverable}
        onClose={() => closeModal('deliverable')}
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
            <Button variant="ghost" size="sm" onClick={() => closeModal('deliverable')}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateDeliverable}
              disabled={!deliverableForm.name.trim() || isAddingDeliverable}
            >
              {isAddingDeliverable ? 'Adding...' : 'Add Deliverable'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Version Modal */}
      <Dialog
        open={modals.version}
        onClose={() => closeModal('version')}
        title="New Version"
        description={`Create a new version frame for "${project.name}" on the board?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => closeModal('version')}>
              Cancel
            </Button>
            <Button onClick={onConfirmVersion}>
              Create Version
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Assign Modal */}
      <Dialog
        open={modals.assign}
        onClose={() => closeModal('assign')}
        title="Assign Designers"
        description={`Select designers for "${project.name}"`}
        size="md"
      >
        <div className={styles.modalContent}>
          <div className={styles.designerGrid}>
            {designersWithWorkload.map((designer) => (
              <div
                key={designer.id}
                className={`${styles.designerCard} ${selectedDesigners.includes(designer.id) ? styles.selected : ''}`}
                onClick={() => onToggleDesigner(designer.id)}
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
            <Button variant="ghost" onClick={() => closeModal('assign')}>
              Cancel
            </Button>
            <Button onClick={onConfirmAssign}>
              Assign ({selectedDesigners.length})
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Archive Modal */}
      <Dialog
        open={modals.archive}
        onClose={() => closeModal('archive')}
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
            <Button variant="ghost" onClick={() => closeModal('archive')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirmArchive}>
              Archive
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Request Changes Modal */}
      <Dialog
        open={modals.clientRequestChanges}
        onClose={() => closeModal('clientRequestChanges')}
        title="Request Changes"
        description={`Send "${project.name}" back to the design team for revisions?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => closeModal('clientRequestChanges')}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={onConfirmClientRequestChanges}>
              Request Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Approve Modal */}
      <Dialog
        open={modals.clientApprove}
        onClose={() => closeModal('clientApprove')}
        title="Approve Project"
        description={`Approve "${project.name}"? The team will be notified to finalize the project.`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => closeModal('clientApprove')}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirmClientApprove}>
              Approve Project
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Client Move to Urgent Modal */}
      <Dialog
        open={modals.clientCritical}
        onClose={() => closeModal('clientCritical')}
        title="Move to Urgent"
        description={`Mark "${project.name}" as urgent? The team will be alerted immediately.`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => closeModal('clientCritical')}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirmClientCritical}>
              Move to Urgent
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Deliverable Modal - Same layout as create */}
      <Dialog
        open={!!modals.editDeliverable}
        onClose={() => { setEditingDeliverable(null); }}
        title={`Edit: ${modals.editDeliverable?.name || 'Deliverable'}`}
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
            <Button variant="ghost" size="sm" onClick={() => { setEditingDeliverable(null); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveDeliverable}
              disabled={isUpdatingDeliverable}
            >
              {isUpdatingDeliverable ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Deliverable Modal */}
      <Dialog
        open={!!modals.deleteDeliverable}
        onClose={() => setDeletingDeliverable(null)}
        title="Delete Deliverable"
        description={`Are you sure you want to delete "${modals.deleteDeliverable?.name}"?`}
        size="sm"
      >
        <div className={styles.modalContent}>
          <p className={styles.deleteWarning}>This action cannot be undone.</p>
          <div className={styles.modalActions}>
            <Button variant="ghost" onClick={() => setDeletingDeliverable(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onDeleteDeliverable} disabled={isDeletingDeliverable}>
              {isDeletingDeliverable ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
});
