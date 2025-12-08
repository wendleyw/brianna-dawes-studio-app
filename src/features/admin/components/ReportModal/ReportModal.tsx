import { useState, useEffect } from 'react';
import { Dialog, Button } from '@shared/ui';
import { useMiro } from '@features/boards';
import { miroClientReportService } from '@features/boards/services/miroClientReportService';
import { supabase } from '@shared/lib/supabase';
import { useAuth } from '@features/auth';
import { createLogger } from '@shared/lib/logger';
import { STATUS_COLUMNS } from '@shared/lib/timelineStatus';
import type { ReportModalProps, ClientOption, ReportFilters } from './ReportModal.types';
import type { Project } from '@features/projects/domain/project.types';
import type { Deliverable } from '@features/deliverables/domain/deliverable.types';
import styles from './ReportModal.module.css';

const logger = createLogger('ReportModal');

const MONTHS = [
  { value: 0, label: 'All Months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const SATISFACTION_LABELS: Record<number, { label: string; className: string }> = {
  1: { label: 'Poor', className: styles.ratingPoor || '' },
  2: { label: 'Needs Improvement', className: styles.ratingNeedsImprovement || '' },
  3: { label: 'Satisfactory', className: styles.ratingSatisfactory || '' },
  4: { label: 'Good', className: styles.ratingGood || '' },
  5: { label: 'Excellent', className: styles.ratingExcellent || '' },
};

// Generate year options (current year - 2 to current year + 1)
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
}

export function ReportModal({ open, onClose }: ReportModalProps) {
  const { isInMiro } = useMiro();
  const { user } = useAuth();

  // Filter state
  const [filters, setFilters] = useState<ReportFilters>({
    clientId: 'all',
    year: new Date().getFullYear(),
    month: null,
    statusFilter: [],
    satisfactionRating: null,
    satisfactionNotes: '',
  });

  // UI state
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch clients on mount
  useEffect(() => {
    if (!open) return;

    const fetchClients = async () => {
      setIsLoadingClients(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('role', 'client')
          .order('name');

        if (fetchError) {
          logger.error('Failed to fetch clients', fetchError);
          return;
        }

        setClients(data || []);
      } catch (err) {
        logger.error('Error fetching clients', err);
      } finally {
        setIsLoadingClients(false);
      }
    };

    fetchClients();
  }, [open]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setProgress([]);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  const addProgress = (message: string) => {
    setProgress((prev) => [...prev, message]);
  };

  const handleStatusToggle = (statusId: string) => {
    setFilters((prev) => ({
      ...prev,
      statusFilter: prev.statusFilter.includes(statusId)
        ? prev.statusFilter.filter((s) => s !== statusId)
        : [...prev.statusFilter, statusId],
    }));
  };

  const handleSatisfactionClick = (rating: number) => {
    setFilters((prev) => ({
      ...prev,
      satisfactionRating: prev.satisfactionRating === rating ? null : rating,
    }));
  };

  const handleGenerateReport = async () => {
    if (!isInMiro) {
      setError('You must be running inside Miro to generate reports');
      return;
    }

    setIsGenerating(true);
    setProgress([]);
    setError(null);
    setSuccess(false);

    try {
      const selectedClient = clients.find((c) => c.id === filters.clientId);

      addProgress('Starting enhanced client report generation...');

      // Build date range filter
      let startDate: string;
      let endDate: string;

      if (filters.month !== null && filters.month > 0) {
        // Specific month
        startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`;
        const lastDay = new Date(filters.year, filters.month, 0).getDate();
        endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`;
        addProgress(`Filtering: ${MONTHS.find(m => m.value === filters.month)?.label} ${filters.year}`);
      } else {
        // Full year
        startDate = `${filters.year}-01-01`;
        endDate = `${filters.year}-12-31`;
        addProgress(`Filtering: Full year ${filters.year}`);
      }

      // Fetch projects with filters
      addProgress('Fetching projects...');
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.clientId !== 'all' && selectedClient) {
        projectsQuery = projectsQuery.eq('client_id', selectedClient.id);
      }

      if (filters.statusFilter.length > 0) {
        projectsQuery = projectsQuery.in('status', filters.statusFilter);
      }

      const { data: projectsData, error: projectsError } = await projectsQuery;

      if (projectsError) {
        throw new Error(`Failed to fetch projects: ${projectsError.message}`);
      }

      const projects = (projectsData || []) as Project[];
      addProgress(`Found ${projects.length} projects`);

      if (projects.length === 0) {
        addProgress('No projects found with the selected filters.');
        setError('No projects found. Try adjusting your filters.');
        setIsGenerating(false);
        return;
      }

      // Fetch deliverables
      addProgress('Fetching deliverables with assets and bonus counts...');
      const projectIds = projects.map((p) => p.id);

      let deliverables: Deliverable[] = [];
      if (projectIds.length > 0) {
        const { data: deliverablesData, error: deliverablesError } = await supabase
          .from('deliverables')
          .select('*')
          .in('project_id', projectIds);

        if (deliverablesError) {
          addProgress(`Warning: Could not fetch deliverables: ${deliverablesError.message}`);
        } else {
          deliverables = (deliverablesData || []) as Deliverable[];
        }
      }

      // Calculate totals
      const totalAssets = deliverables.reduce((sum, d) => sum + (d.count || 0), 0);
      const totalBonus = deliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0);
      addProgress(`Found ${deliverables.length} deliverables (${totalAssets} assets, ${totalBonus} bonus)`);

      // Build report title
      const periodLabel = filters.month !== null && filters.month > 0
        ? `${MONTHS.find(m => m.value === filters.month)?.label} ${filters.year}`
        : `${filters.year}`;

      const clientLabel = filters.clientId === 'all'
        ? 'All Clients'
        : (selectedClient?.name || 'Unknown');

      // Generate enhanced report on Miro
      addProgress('Creating visual report with charts on Miro board...');
      addProgress('  - Building weekly breakdown...');
      addProgress('  - Creating bar charts...');
      addProgress('  - Creating deliverables funnel...');
      if (filters.satisfactionRating) {
        addProgress('  - Adding satisfaction rating...');
      }

      const reportData = {
        clientName: `${clientLabel} - ${periodLabel}`,
        ...(selectedClient?.email ? { clientEmail: selectedClient.email } : {}),
        projects,
        deliverables,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.name || user?.email || 'Admin',
        ...(filters.satisfactionRating ? { satisfactionRating: filters.satisfactionRating } : {}),
        ...(filters.satisfactionNotes ? { satisfactionNotes: filters.satisfactionNotes } : {}),
      };

      const frameId = await miroClientReportService.generateClientReport(reportData);

      addProgress('');
      addProgress('Enhanced report generated successfully!');
      addProgress(`Frame ID: ${frameId}`);
      addProgress('');
      addProgress('Report includes:');
      addProgress(`  - ${totalAssets} total assets across ${deliverables.length} deliverables`);
      addProgress(`  - ${totalBonus} bonus items`);
      addProgress('  - Weekly performance bar chart');
      addProgress('  - Deliverables funnel visualization');
      if (filters.satisfactionRating) {
        const ratingInfo = SATISFACTION_LABELS[filters.satisfactionRating];
        addProgress(`  - Client satisfaction: ${filters.satisfactionRating}/5 (${ratingInfo?.label})`);
      }
      setSuccess(true);

    } catch (err) {
      logger.error('Report generation failed', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      addProgress(`ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const currentRatingInfo = filters.satisfactionRating ? SATISFACTION_LABELS[filters.satisfactionRating] : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Generate Client Report"
      description="Create an enhanced visual report with charts, weekly breakdown, and satisfaction tracking"
      size="lg"
    >
      <div className={styles.container}>
        {/* Miro Status */}
        <div className={styles.statusBar}>
          <span>Miro Connection: </span>
          <span className={isInMiro ? styles.connected : styles.disconnected}>
            {isInMiro ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Filters Section */}
        <div className={styles.filtersSection}>
          <h3 className={styles.sectionTitle}>Report Filters</h3>

          {/* Client Filter */}
          <div className={styles.formGroup}>
            <label htmlFor="clientFilter" className={styles.label}>
              Client
            </label>
            <select
              id="clientFilter"
              value={filters.clientId}
              onChange={(e) => setFilters((prev) => ({ ...prev, clientId: e.target.value }))}
              className={styles.select}
              disabled={isLoadingClients || isGenerating}
            >
              <option value="all">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filters */}
          <div className={styles.dateFilters}>
            <div className={styles.formGroup}>
              <label htmlFor="yearFilter" className={styles.label}>
                Year
              </label>
              <select
                id="yearFilter"
                value={filters.year}
                onChange={(e) => setFilters((prev) => ({ ...prev, year: parseInt(e.target.value) }))}
                className={styles.select}
                disabled={isGenerating}
              >
                {getYearOptions().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="monthFilter" className={styles.label}>
                Month
              </label>
              <select
                id="monthFilter"
                value={filters.month ?? 0}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setFilters((prev) => ({ ...prev, month: val === 0 ? null : val }));
                }}
                className={styles.select}
                disabled={isGenerating}
              >
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Filter by Status (optional)</label>
            <div className={styles.statusChips}>
              {STATUS_COLUMNS.map((status) => (
                <button
                  key={status.id}
                  type="button"
                  className={`${styles.statusChip} ${
                    filters.statusFilter.includes(status.id) ? styles.statusChipActive : ''
                  }`}
                  style={{
                    '--chip-color': status.color,
                  } as React.CSSProperties}
                  onClick={() => handleStatusToggle(status.id)}
                  disabled={isGenerating}
                >
                  {status.label}
                </button>
              ))}
            </div>
            {filters.statusFilter.length === 0 && (
              <span className={styles.hint}>No filter = all statuses included</span>
            )}
          </div>
        </div>

        {/* Client Satisfaction Section */}
        <div className={styles.satisfactionSection}>
          <label className={styles.satisfactionLabel}>
            Client Satisfaction Rating (optional)
          </label>
          <div className={styles.starRating}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className={`${styles.star} ${
                  filters.satisfactionRating && rating <= filters.satisfactionRating
                    ? styles.starActive
                    : ''
                }`}
                onClick={() => handleSatisfactionClick(rating)}
                disabled={isGenerating}
                aria-label={`Rate ${rating} stars`}
              >
                ⭐
              </button>
            ))}
            {currentRatingInfo && (
              <span className={`${styles.ratingLabel} ${currentRatingInfo.className}`}>
                {currentRatingInfo.label}
              </span>
            )}
          </div>
          <textarea
            className={styles.notesInput}
            placeholder="Add notes about client satisfaction (optional)..."
            value={filters.satisfactionNotes}
            onChange={(e) => setFilters((prev) => ({ ...prev, satisfactionNotes: e.target.value }))}
            disabled={isGenerating}
          />
          {!filters.satisfactionRating && (
            <span className={styles.hint}>Click stars to add satisfaction rating to the report</span>
          )}
        </div>

        {/* Progress Log */}
        {progress.length > 0 && (
          <div className={styles.progressLog}>
            {progress.map((msg, i) => (
              <div key={i} className={styles.progressLine}>
                {msg}
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && <div className={styles.error}>{error}</div>}

        {/* Success Message */}
        {success && (
          <div className={styles.success}>
            Enhanced report created successfully! The board has been zoomed to show the report with
            weekly charts and visualizations.
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onClose} disabled={isGenerating}>
            {success ? 'Close' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerateReport}
            isLoading={isGenerating}
            disabled={!isInMiro || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Report'}
          </Button>
        </div>

        {!isInMiro && (
          <div className={styles.warning}>
            You must be running inside Miro to generate reports.
          </div>
        )}
      </div>
    </Dialog>
  );
}
