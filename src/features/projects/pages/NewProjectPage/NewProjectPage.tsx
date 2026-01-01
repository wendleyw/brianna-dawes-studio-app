import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@shared/ui';
import { useAuth } from '@features/auth';
import { useUsers } from '@features/admin/hooks';
import type { User } from '@features/admin/domain/admin.types';
import type { ProjectType } from '@features/admin/services/projectTypeService';
import { useMiro } from '@features/boards';
import { useCreateProjectWithMiro, useProjectTypes } from '../../hooks';
import { createLogger } from '@shared/lib/logger';
import { PRIORITY_OPTIONS } from '@shared/lib/priorityConfig';
import { MiroNotifications } from '@shared/lib/miroNotifications';
import styles from './NewProjectPage.module.css';

const logger = createLogger('NewProjectPage');

// Calendar icon
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

// Warning icon
const WarningIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

// Alert icon for board mismatch
const AlertIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const ArrowRightIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

interface ProjectBriefing {
  // Basic Info
  name: string;
  clientId: string;
  projectType: string;

  // Project Details
  goalsObjectives: string;
  projectOverview: string;
  targetAudience: string;

  // Content & Copy
  finalMessaging: string;
  deliverables: string;

  // Resources & References
  resourceLinks: string;
  inspirations: string;
  styleNotes: string;
  additionalNotes: string;

  // Timeline & Priority
  targetDate: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

// Project types are now loaded dynamically via useProjectTypes hook

// PRIORITY_OPTIONS imported from @shared/lib/priorityConfig

// Calculate due date adding business days (skip weekends)
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let addedDays = 0;

  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      addedDays++;
    }
  }

  return result;
}

// Format date as YYYY-MM-DD for input[type="date"]
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

export function NewProjectPage() {
  const navigate = useNavigate();
  // Data hooks
  const { user, isLoading: authLoading } = useAuth();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const { data: projectTypes = [] } = useProjectTypes();
  const { boardId, isInMiro } = useMiro();
  const createProject = useCreateProjectWithMiro();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Specific date state
  const [wantsSpecificDate, setWantsSpecificDate] = useState(false);
  const [autoCalculatedDate, setAutoCalculatedDate] = useState<string>('');
  const [hasCustomDate, setHasCustomDate] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Get list of clients for admin to select from
  const clients = usersData?.filter((u: User) => u.role === 'client') || [];

  // Find client associated with current Miro board
  const clientFromBoard = useMemo(() => {
    if (!boardId || !usersData) return null;
    // Find client whose primaryBoardId matches the current board
    return usersData.find((u: User) => u.role === 'client' && u.primaryBoardId === boardId) || null;
  }, [boardId, usersData]);

  const [formData, setFormData] = useState<ProjectBriefing>({
    name: '',
    clientId: isAdmin ? '' : (user?.id || ''),
    projectType: '',
    goalsObjectives: '',
    projectOverview: '',
    targetAudience: '',
    finalMessaging: '',
    deliverables: '',
    resourceLinks: '',
    inspirations: '',
    styleNotes: '',
    additionalNotes: '',
    targetDate: '',
    priority: 'medium',
  });

  // Find selected client info (for board mismatch detection)
  const selectedClient = useMemo(() => {
    if (!formData.clientId || !usersData) return null;
    return usersData.find((u: User) => u.id === formData.clientId) || null;
  }, [formData.clientId, usersData]);

  // Detect board mismatch: selected client has a different primaryBoardId than current board
  const boardMismatch = useMemo(() => {
    if (!isInMiro || !boardId || !selectedClient) return null;

    // If selected client has a primary board and it's different from current board
    if (selectedClient.primaryBoardId && selectedClient.primaryBoardId !== boardId) {
      return {
        currentBoardId: boardId,
        clientBoardId: selectedClient.primaryBoardId,
        clientName: selectedClient.name,
      };
    }
    return null;
  }, [isInMiro, boardId, selectedClient]);

  // State to track which board to use when there's a mismatch
  // 'current' = create on current board, 'client' = save with client's board (no sync until correct board)
  const [boardChoice, setBoardChoice] = useState<'current' | 'client'>('client');

  logger.debug('Board detection', {
    boardId,
    isInMiro,
    clientFromBoard: clientFromBoard?.name,
    selectedClient: selectedClient?.name,
    boardMismatch: !!boardMismatch,
    clients: clients.length
  });

  const priorityLabels = useMemo(() => {
    return PRIORITY_OPTIONS.reduce<Record<string, string>>((acc, option) => {
      const label = option.label.toLowerCase();
      acc[option.value] = label.charAt(0).toUpperCase() + label.slice(1);
      return acc;
    }, {});
  }, []);

  const updateField = (field: keyof ProjectBriefing, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle project type selection - auto-calculate due date
  const handleProjectTypeChange = (typeValue: string) => {
    const projectType = projectTypes.find((t: ProjectType) => t.value === typeValue);

    if (projectType) {
      // Calculate due date from today + business days
      const today = new Date();
      const dueDate = addBusinessDays(today, projectType.days);
      const dueDateStr = formatDateForInput(dueDate);

      // Save auto-calculated date for comparison later
      setAutoCalculatedDate(dueDateStr);
      setHasCustomDate(false);
      setWantsSpecificDate(false);

      setFormData(prev => ({
        ...prev,
        projectType: typeValue,
        targetDate: dueDateStr,
      }));
    } else {
      setFormData(prev => ({ ...prev, projectType: typeValue }));
    }
  };

  // Handle specific date change
  const handleSpecificDateChange = (newDate: string) => {
    setFormData(prev => ({ ...prev, targetDate: newDate }));
    // Check if the date is different from auto-calculated
    setHasCustomDate(newDate !== autoCalculatedDate);
  };

  // Handle toggle for specific date
  const handleToggleSpecificDate = () => {
    if (wantsSpecificDate) {
      // Reverting to auto-calculated date
      setWantsSpecificDate(false);
      setFormData(prev => ({ ...prev, targetDate: autoCalculatedDate }));
      setHasCustomDate(false);
    } else {
      // Enable specific date - mark as custom immediately and set priority to urgent
      setWantsSpecificDate(true);
      setHasCustomDate(true);
      setFormData(prev => ({ ...prev, priority: 'urgent' }));
    }
  };

  // Auto-set clientId based on context
  const clientFromBoardId = clientFromBoard?.id;
  const clientFromBoardName = clientFromBoard?.name ?? null;
  useEffect(() => {
    // For admin users: prefer client detected from board
    if (isAdmin && clientFromBoardId && !formData.clientId) {
      logger.debug('Auto-selecting client from board', { client: clientFromBoardName });
      setFormData(prev => ({ ...prev, clientId: clientFromBoardId }));
      return;
    }

    // For non-admin users: use their own ID
    if (!isAdmin && user?.id && !formData.clientId) {
      setFormData(prev => ({ ...prev, clientId: user.id }));
    }
  }, [isAdmin, user?.id, formData.clientId, clientFromBoardId, clientFromBoardName]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    logger.debug('Submit called', { name: formData.name, projectType: formData.projectType, isAdmin });

    // Only 3 required fields: Title, Type, and Deliverables
    if (!formData.projectType) {
      setError('Please select a project type');
      scrollToTop();
      return;
    }

    if (!formData.name.trim()) {
      setError('Project name is required');
      scrollToTop();
      return;
    }

    if (!formData.deliverables.trim()) {
      setError('Deliverables is required');
      scrollToTop();
      return;
    }

    // Auto-set clientId if not provided
    if (!formData.clientId && user?.id) {
      formData.clientId = user.id;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get project type info for description
      const selectedProjectType = projectTypes.find((t: ProjectType) => t.value === formData.projectType);
      const projectTypeLabel = selectedProjectType?.label || formData.projectType;

      // Create the project with briefing data in description
      // Empty fields show "Needs attention" to indicate client input required
      const needsAttention = '⚠️ Needs attention';
      const briefingDescription = `
## Project Type
${projectTypeLabel} (${selectedProjectType?.days || 0} business days)

## Goals & Objectives
${formData.goalsObjectives || needsAttention}

## Project Overview
${formData.projectOverview || needsAttention}

## Target Audience
${formData.targetAudience || needsAttention}

## Final Messaging / Copy
${formData.finalMessaging || needsAttention}

## Deliverables
${formData.deliverables || needsAttention}

## Resource Links / Assets
${formData.resourceLinks || needsAttention}

## Inspirations / References
${formData.inspirations || needsAttention}

## Style / Design Notes
${formData.styleNotes || needsAttention}

## Additional Notes
${formData.additionalNotes || needsAttention}
      `.trim();

      // Format due date to ISO 8601 format if provided
      // Important: Parse as UTC to avoid timezone shift (e.g., "2024-01-01" becoming "2023-12-31" in UTC)
      const formattedDueDate = formData.targetDate
        ? new Date(formData.targetDate + 'T12:00:00.000Z').toISOString()
        : null;

      // Determine which board to use:
      // - If there's a mismatch and user chose 'client', use client's board (no immediate sync)
      // - If there's a mismatch and user chose 'current', use current board (sync happens now)
      // - If no mismatch, use current board
      const targetBoardId = boardMismatch && boardChoice === 'client'
        ? boardMismatch.clientBoardId
        : boardId;

      // Determine if we should skip sync (when creating on client's board but we're on different board)
      const skipMiroSync = !!(boardMismatch && boardChoice === 'client');

      logger.debug('Creating project', {
        name: formData.name,
        priority: formData.priority,
        dueDate: formattedDueDate,
        clientId: formData.clientId,
        currentBoardId: boardId,
        targetBoardId,
        boardMismatch: !!boardMismatch,
        boardChoice,
        skipMiroSync,
      });

      // Set initial status based on priority - urgent priority goes to urgent column
      const initialStatus = formData.priority === 'urgent' ? 'urgent' : 'in_progress';

      const projectData: Parameters<typeof createProject.mutateAsync>[0] = {
        name: formData.name,
        description: briefingDescription,
        priority: formData.priority,
        dueDate: formattedDueDate,
        status: initialStatus,
        clientId: formData.clientId,
        // Due date approval - false if user customized the date
        dueDateApproved: !hasCustomDate,
        // Pass briefing data for Miro board creation
        briefing: {
          projectType: formData.projectType || null, // Store the project_types.value key for consistent filtering
          projectOverview: formData.projectOverview || null,
          finalMessaging: formData.finalMessaging || null,
          inspirations: formData.inspirations || null,
          targetAudience: formData.targetAudience || null,
          deliverables: formData.deliverables || null,
          styleNotes: formData.styleNotes || null,
          goals: formData.goalsObjectives || null,
          timeline: `${projectTypeLabel} (${selectedProjectType?.days || 0} days) - Target: ${formData.targetDate}`,
          resourceLinks: formData.resourceLinks || null,
          additionalNotes: formData.additionalNotes || null,
        },
        // Flag to skip Miro sync when board mismatch and creating for client's board
        skipMiroSync,
      };

      // Add Miro board info - use target board (client's or current)
      if (targetBoardId) {
        projectData.miroBoardId = targetBoardId;
        projectData.miroBoardUrl = `https://miro.com/app/board/${targetBoardId}`;
      }

      await createProject.mutateAsync(projectData);
      logger.info('Project created successfully', { name: formData.name });

      // Show Miro notification
      await MiroNotifications.projectCreated(formData.name);

      // Navigate to projects list
      navigate('/projects');
    } catch (err) {
      logger.error('Failed to create project', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      scrollToTop();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {error && <div className={styles.error}>{error}</div>}

      {/* Form */}
      <div className={styles.form}>
        <div className={styles.pageIntro}>
          <h1 className={styles.pageTitle}>Create Project</h1>
          <p className={styles.pageSubtitle}>
            Fill in the details below to create a new project and get started.
          </p>
        </div>

        {/* Basic Information */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionStep}>1</span>
            <h2 className={styles.sectionTitle}>Basic Information</h2>
          </div>

          {/* Client/Owner Selection - First field for admin */}
          {isAdmin && (
            <div className={styles.field}>
              <label className={styles.label}>
                PROJECT OWNER
              </label>
              <select
                className={styles.select}
                value={formData.clientId}
                onChange={(e) => updateField('clientId', e.target.value)}
              >
                <option value="">Select project owner...</option>
                {/* Admin can create project for themselves */}
                <option value={user?.id || ''}>
                  {user?.name} (Admin - Me)
                </option>
                {/* Divider */}
                <option disabled>──────────</option>
                {/* List of clients - highlight detected client if any */}
                {clients.map((client: User) => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email}){clientFromBoard?.id === client.id ? ' ✓ Board' : ''}
                  </option>
                ))}
              </select>
              <span className={styles.hint}>
                {clientFromBoard
                  ? `Client "${clientFromBoard.name}" detected from this board, but you can choose differently`
                  : 'Who owns this project? Select yourself or a client'
                }
              </span>

              {/* Board Mismatch Warning */}
              {boardMismatch && (
                <div className={styles.boardMismatchWarning}>
                  <div className={styles.boardMismatchHeader}>
                    <AlertIcon />
                    <span>Different Board Detected</span>
                  </div>
                  <p className={styles.boardMismatchText}>
                    You're on a different board than <strong>{boardMismatch.clientName}</strong>'s assigned board.
                    Choose where to create this project:
                  </p>
                  <div className={styles.boardChoiceOptions}>
                    <label className={`${styles.boardChoice} ${boardChoice === 'client' ? styles.boardChoiceActive : ''}`}>
                      <input
                        type="radio"
                        name="boardChoice"
                        value="client"
                        checked={boardChoice === 'client'}
                        onChange={() => setBoardChoice('client')}
                      />
                      <div className={styles.boardChoiceContent}>
                        <strong>Client's Board</strong>
                        <span>Save project for {boardMismatch.clientName}'s board. Miro sync will happen when you open that board.</span>
                      </div>
                    </label>
                    <label className={`${styles.boardChoice} ${boardChoice === 'current' ? styles.boardChoiceActive : ''}`}>
                      <input
                        type="radio"
                        name="boardChoice"
                        value="current"
                        checked={boardChoice === 'current'}
                        onChange={() => setBoardChoice('current')}
                      />
                      <div className={styles.boardChoiceContent}>
                        <strong>Current Board</strong>
                        <span>Create on THIS board instead. Project will appear here immediately.</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>
              PROJECT NAME <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g., Q1 Marketing Campaign"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
            <span className={styles.hint}>Clear, descriptive name for this project</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              PROJECT TYPE <span className={styles.required}>*</span>
            </label>
            <select
              className={styles.select}
              value={formData.projectType}
              onChange={(e) => handleProjectTypeChange(e.target.value)}
            >
              <option value="">Select project type...</option>
              {projectTypes.map((type: ProjectType) => (
                <option key={type.value} value={type.value}>
                  {type.label} ({type.days} days)
                </option>
              ))}
            </select>
            <span className={styles.hint}>Due date will be auto-calculated based on project type</span>
          </div>
        </section>

        {/* Project Details */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionStep}>2</span>
            <h2 className={styles.sectionTitle}>Project Details</h2>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              GOALS & OBJECTIVES
            </label>
            <textarea
              className={styles.textarea}
              placeholder="What do you want to achieve with this project?"
              rows={3}
              maxLength={500}
              value={formData.goalsObjectives}
              onChange={(e) => updateField('goalsObjectives', e.target.value)}
            />
            <span className={styles.charCount}>{formData.goalsObjectives.length} / 500</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              PROJECT OVERVIEW
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Project idea, goals, purpose and context. Include the 'why' behind the project..."
              rows={4}
              maxLength={1000}
              value={formData.projectOverview}
              onChange={(e) => updateField('projectOverview', e.target.value)}
            />
            <span className={styles.charCount}>{formData.projectOverview.length} / 1000</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              TARGET AUDIENCE
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Who is this project for? Describe your target audience..."
              rows={3}
              maxLength={500}
              value={formData.targetAudience}
              onChange={(e) => updateField('targetAudience', e.target.value)}
            />
            <span className={styles.charCount}>{formData.targetAudience.length} / 500</span>
          </div>
        </section>

        {/* Content & Copy */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionStep}>3</span>
            <h2 className={styles.sectionTitle}>Content & Copy</h2>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              FINAL MESSAGING / COPY
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Provide the final copy/text for this project..."
              rows={3}
              maxLength={2000}
              value={formData.finalMessaging}
              onChange={(e) => updateField('finalMessaging', e.target.value)}
            />
            <span className={styles.charCount}>{formData.finalMessaging.length} / 2000</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              DELIVERABLES <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="• File type(s): e.g., JPG, PNG, PDF, AI, MP4
• File sizes / dimensions: e.g., 1080x1920px..."
              rows={4}
              maxLength={1000}
              value={formData.deliverables}
              onChange={(e) => updateField('deliverables', e.target.value)}
            />
            <span className={styles.charCount}>{formData.deliverables.length} / 1000</span>
          </div>
        </section>

        {/* Resources & References */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionStep}>4</span>
            <h2 className={styles.sectionTitle}>Resources & References</h2>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>RESOURCE LINKS / ASSETS</label>
            <textarea
              className={styles.textarea}
              placeholder="Links to logos, fonts, brand guidelines, stock images..."
              rows={3}
              maxLength={1000}
              value={formData.resourceLinks}
              onChange={(e) => updateField('resourceLinks', e.target.value)}
            />
            <span className={styles.charCount}>{formData.resourceLinks.length} / 1000</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>INSPIRATIONS / REFERENCES</label>
            <textarea
              className={styles.textarea}
              placeholder="Links, screenshots, mood boards, examples of work you like..."
              rows={3}
              maxLength={1000}
              value={formData.inspirations}
              onChange={(e) => updateField('inspirations', e.target.value)}
            />
            <span className={styles.charCount}>{formData.inspirations.length} / 1000</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>STYLE / DESIGN NOTES</label>
            <textarea
              className={styles.textarea}
              placeholder="Colors, typography, illustration style, photography style..."
              rows={3}
              maxLength={1000}
              value={formData.styleNotes}
              onChange={(e) => updateField('styleNotes', e.target.value)}
            />
            <span className={styles.charCount}>{formData.styleNotes.length} / 1000</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>ADDITIONAL NOTES</label>
            <textarea
              className={styles.textarea}
              placeholder="Any special requirements or notes for this project..."
              rows={3}
              maxLength={1000}
              value={formData.additionalNotes}
              onChange={(e) => updateField('additionalNotes', e.target.value)}
            />
            <span className={styles.charCount}>{formData.additionalNotes.length} / 1000</span>
          </div>
        </section>

        {/* Timeline & Priority */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionStep}>5</span>
            <h2 className={styles.sectionTitle}>Timeline & Priority</h2>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              TARGET COMPLETION DATE
            </label>
            <div className={styles.dueDateSection}>
              {/* Auto-calculated date display (readonly) */}
              <div className={`${styles.dueDateDisplay} ${formData.targetDate ? styles.hasValue : ''}`}>
                <CalendarIcon />
                <span>
                  {formData.targetDate
                    ? new Date(formData.targetDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                    : 'Select project type first'}
                </span>
                {formData.projectType && !wantsSpecificDate && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--color-gray-400)' }}>
                    Auto-calculated
                  </span>
                )}
              </div>

              {/* Toggle for specific date */}
              {formData.projectType && (
                <label
                  className={`${styles.specificDateToggle} ${wantsSpecificDate ? styles.active : ''}`}
                >
                  <input
                    type="checkbox"
                    className={styles.checkbox}
                    checked={wantsSpecificDate}
                    onChange={handleToggleSpecificDate}
                  />
                  <span className={styles.toggleLabel}>I want a specific date</span>
                  <span className={styles.toggleHint}>Requires approval</span>
                </label>
              )}

              {/* Editable date input when toggle is on */}
              {wantsSpecificDate && (
                <>
                  <input
                    type="date"
                    className={styles.specificDateInput}
                    value={formData.targetDate}
                    onChange={(e) => handleSpecificDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {hasCustomDate && (
                    <div className={styles.approvalWarning}>
                      <WarningIcon />
                      <span>This custom date will need admin approval before the deadline is confirmed</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              PRIORITY LEVEL
              {wantsSpecificDate && (
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-warning)', fontWeight: 'normal' }}>
                  (Auto-set to Urgent for specific dates)
                </span>
              )}
            </label>
            <div className={styles.priorityGrid}>
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.priorityOption} ${formData.priority === option.value ? styles.prioritySelected : ''
                    }`}
                  onClick={() => !wantsSpecificDate && updateField('priority', option.value)}
                  disabled={wantsSpecificDate}
                  style={wantsSpecificDate ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <span
                    className={styles.priorityDot}
                    style={{ backgroundColor: option.color }}
                  />
                  <span className={styles.priorityLabel}>{priorityLabels[option.value] || option.label}</span>
                  <span className={styles.priorityCheck} aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          {error && <div className={styles.actionError}>{error}</div>}
          <div className={styles.actionButtons}>
            <Button variant="ghost" className={styles.cancelButton} onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className={styles.submitButton}
              rightIcon={<ArrowRightIcon />}
              onClick={handleSubmit}
              isLoading={isSubmitting}
              disabled={authLoading || (isAdmin && usersLoading)}
            >
              {authLoading || (isAdmin && usersLoading) ? 'Loading...' : 'Create Project'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
