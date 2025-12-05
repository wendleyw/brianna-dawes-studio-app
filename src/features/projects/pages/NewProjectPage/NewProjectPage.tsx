import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Logo } from '@shared/ui';
import { useAuth } from '@features/auth';
import { useUsers } from '@features/admin/hooks';
import { useMiro } from '@features/boards';
import { useCreateProjectWithMiro } from '../../hooks';
import { createLogger } from '@shared/lib/logger';
import styles from './NewProjectPage.module.css';

const logger = createLogger('NewProjectPage');

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

// Project types with durations in business days
const PROJECT_TYPES = [
  { value: 'website-ui-design', label: 'Website UI Design', days: 45 },
  { value: 'marketing-campaign', label: 'Marketing Campaign', days: 14 },
  { value: 'video-production', label: 'Video Production', days: 9 },
  { value: 'email-design', label: 'Email Design', days: 7 },
  { value: 'social-post-carousel', label: 'Social Post Design', days: 5 },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'urgent', label: 'Urgent', color: '#EF4444' },
  { value: 'high', label: 'High', color: '#F97316' },
  { value: 'medium', label: 'Medium', color: '#F59E0B' },
  { value: 'low', label: 'Standard', color: '#10B981' },
] as const;

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
  const { user, isLoading: authLoading } = useAuth();
  const { data: usersData, isLoading: usersLoading } = useUsers();
  const { boardId, isInMiro } = useMiro();
  const createProject = useCreateProjectWithMiro();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === 'admin';

  // Get list of clients for admin to select from
  const clients = usersData?.filter(u => u.role === 'client') || [];

  // Find client associated with current Miro board
  const clientFromBoard = useMemo(() => {
    if (!boardId || !usersData) return null;
    // Find client whose primaryBoardId matches the current board
    return usersData.find(u => u.role === 'client' && u.primaryBoardId === boardId) || null;
  }, [boardId, usersData]);

  logger.debug('Board detection', { boardId, isInMiro, clientFromBoard: clientFromBoard?.name, clients: clients.length });

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

  const updateField = (field: keyof ProjectBriefing, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle project type selection - auto-calculate due date
  const handleProjectTypeChange = (typeValue: string) => {
    const projectType = PROJECT_TYPES.find(t => t.value === typeValue);

    if (projectType) {
      // Calculate due date from today + business days
      const today = new Date();
      const dueDate = addBusinessDays(today, projectType.days);

      setFormData(prev => ({
        ...prev,
        projectType: typeValue,
        targetDate: formatDateForInput(dueDate),
      }));
    } else {
      setFormData(prev => ({ ...prev, projectType: typeValue }));
    }
  };

  // Auto-set clientId based on context
  const clientFromBoardId = clientFromBoard?.id;
  useEffect(() => {
    // For admin users: prefer client detected from board
    if (isAdmin && clientFromBoardId && !formData.clientId) {
      logger.debug('Auto-selecting client from board', { client: clientFromBoard?.name });
      setFormData(prev => ({ ...prev, clientId: clientFromBoardId }));
      return;
    }

    // For non-admin users: use their own ID
    if (!isAdmin && user?.id && !formData.clientId) {
      setFormData(prev => ({ ...prev, clientId: user.id }));
    }
  }, [isAdmin, user?.id, formData.clientId, clientFromBoardId]);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    logger.debug('Submit called', { name: formData.name, projectType: formData.projectType, isAdmin });

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

    if (!formData.clientId) {
      setError(isAdmin ? 'Please select a client' : 'User not loaded. Please try again.');
      scrollToTop();
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get project type info for description
      const selectedProjectType = PROJECT_TYPES.find(t => t.value === formData.projectType);
      const projectTypeLabel = selectedProjectType?.label || formData.projectType;

      // Create the project with briefing data in description
      const briefingDescription = `
## Project Type
${projectTypeLabel} (${selectedProjectType?.days || 0} business days)

## Goals & Objectives
${formData.goalsObjectives || 'Not specified'}

## Project Overview
${formData.projectOverview || 'Not specified'}

## Target Audience
${formData.targetAudience || 'Not specified'}

## Final Messaging / Copy
${formData.finalMessaging || 'Not specified'}

## Deliverables
${formData.deliverables || 'Not specified'}

## Resource Links / Assets
${formData.resourceLinks || 'Not specified'}

## Inspirations / References
${formData.inspirations || 'Not specified'}

## Style / Design Notes
${formData.styleNotes || 'Not specified'}

## Additional Notes
${formData.additionalNotes || 'Not specified'}
      `.trim();

      // Format due date to ISO 8601 format if provided
      // Important: Parse as UTC to avoid timezone shift (e.g., "2024-01-01" becoming "2023-12-31" in UTC)
      const formattedDueDate = formData.targetDate
        ? new Date(formData.targetDate + 'T12:00:00.000Z').toISOString()
        : null;

      logger.debug('Creating project', {
        name: formData.name,
        priority: formData.priority,
        dueDate: formattedDueDate,
        clientId: formData.clientId,
        miroBoardId: boardId,
      });

      const projectData: Parameters<typeof createProject.mutateAsync>[0] = {
        name: formData.name,
        description: briefingDescription,
        priority: formData.priority,
        dueDate: formattedDueDate,
        status: 'on_track',
        clientId: formData.clientId,
        // Pass briefing data for Miro board creation
        briefing: {
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
      };

      // Add Miro board info if available
      if (boardId) {
        projectData.miroBoardId = boardId;
        projectData.miroBoardUrl = `https://miro.com/app/board/${boardId}`;
      }

      await createProject.mutateAsync(projectData);
      logger.info('Project created successfully', { name: formData.name });

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
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.logo}>
            <Logo size="md" />
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.brandName}>BRIANNA DAWES STUDIOS</h1>
            <span className={styles.pageTitle}>Create Project</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          {user?.avatarUrl && (
            <img
              src={user.avatarUrl}
              alt={user.name || 'User'}
              className={styles.avatar}
            />
          )}
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {/* Form */}
      <div className={styles.form}>
        {/* Basic Information */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Basic Information</h2>

          {/* Client/Owner Selection - First field for admin */}
          {isAdmin && (
            <div className={styles.field}>
              <label className={styles.label}>
                PROJECT OWNER <span className={styles.required}>*</span>
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
                {clients.map((client) => (
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
              {PROJECT_TYPES.map((type) => (
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
          <h2 className={styles.sectionTitle}>Project Details</h2>

          <div className={styles.field}>
            <label className={styles.label}>
              GOALS & OBJECTIVES <span className={styles.required}>*</span>
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
              PROJECT OVERVIEW <span className={styles.required}>*</span>
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
              TARGET AUDIENCE <span className={styles.required}>*</span>
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
          <h2 className={styles.sectionTitle}>Content & Copy</h2>

          <div className={styles.field}>
            <label className={styles.label}>
              FINAL MESSAGING / COPY <span className={styles.required}>*</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="Provide the final copy/text for this project..."
              rows={3}
              maxLength={2000}
              value={formData.finalMessaging}
              onChange={(e) => updateField('finalMessaging', e.target.value)}
            />
            <span className={styles.warning}>Required later if blank</span>
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
          <h2 className={styles.sectionTitle}>Resources & References</h2>

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
          <h2 className={styles.sectionTitle}>Timeline & Priority</h2>

          <div className={styles.field}>
            <label className={styles.label}>
              TARGET COMPLETION DATE <span className={styles.required}>*</span>
            </label>
            <input
              type="date"
              className={styles.input}
              value={formData.targetDate}
              onChange={(e) => updateField('targetDate', e.target.value)}
            />
            <span className={styles.hint}>When do you need this completed?</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              PRIORITY LEVEL <span className={styles.required}>*</span>
            </label>
            <div className={styles.priorityGrid}>
              {PRIORITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.priorityOption} ${
                    formData.priority === option.value ? styles.prioritySelected : ''
                  }`}
                  onClick={() => updateField('priority', option.value)}
                >
                  <span
                    className={styles.priorityDot}
                    style={{ backgroundColor: option.color }}
                  />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className={styles.actions}>
          {error && <div className={styles.actionError}>{error}</div>}
          <div className={styles.actionButtons}>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button
              variant="primary"
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
