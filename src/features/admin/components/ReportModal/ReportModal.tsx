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

// Quick period presets
const PERIOD_PRESETS = [
  { label: 'This Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }},
  { label: 'Last Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end };
  }},
  { label: 'Last 3 Months', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start, end };
  }},
  { label: 'This Year', getValue: () => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), 0, 1),
      end: now, // Up to today instead of Dec 31
    };
  }},
  { label: 'Last Year', getValue: () => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear() - 1, 0, 1),
      end: new Date(now.getFullYear() - 1, 11, 31),
    };
  }},
];

// Format date to YYYY-MM-DD for input
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get default date range (current year)
function getDefaultDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return {
    startDate: formatDateForInput(new Date(now.getFullYear(), 0, 1)),
    endDate: formatDateForInput(new Date(now.getFullYear(), 11, 31)),
  };
}

export function ReportModal({ open, onClose }: ReportModalProps) {
  const { isInMiro } = useMiro();
  const { user } = useAuth();

  // Filter state
  const defaultRange = getDefaultDateRange();
  const [filters, setFilters] = useState<ReportFilters>({
    clientId: 'all',
    startDate: defaultRange.startDate,
    endDate: defaultRange.endDate,
    statusFilter: [],
  });

  // Handle preset selection
  const handlePresetClick = (preset: typeof PERIOD_PRESETS[0]) => {
    const { start, end } = preset.getValue();
    setFilters(prev => ({
      ...prev,
      startDate: formatDateForInput(start),
      endDate: formatDateForInput(end),
    }));
  };

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

      // Use date range from filters
      const startDate = filters.startDate;
      const endDate = filters.endDate;

      // Format date range for display
      const startDisplay = new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const endDisplay = new Date(endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      addProgress(`Date range: ${startDisplay} - ${endDisplay}`);

      // Fetch projects with filters
      // Filter by due_date to get projects that were due/completed in the selected period
      // This is more useful for reports than created_at
      addProgress('Fetching projects...');
      let projectsQuery = supabase
        .from('projects')
        .select('*')
        .gte('due_date', startDate)
        .lte('due_date', endDate);

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

      // Map snake_case DB fields to camelCase
      const projects = (projectsData || []).map((p) => ({
        ...p,
        id: p.id as string,
        name: p.name as string,
        status: p.status as Project['status'],
        clientId: p.client_id as string,
        createdAt: p.created_at as string,
        updatedAt: p.updated_at as string,
        dueDate: p.due_date as string | undefined,
        briefing: p.briefing as Project['briefing'],
      })) as Project[];
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
          // Map snake_case DB fields to camelCase
          deliverables = (deliverablesData || []).map((d) => ({
            ...d,
            id: d.id as string,
            projectId: d.project_id as string,
            name: d.name as string,
            status: d.status as Deliverable['status'],
            count: (d.count as number) || 0,
            bonusCount: (d.bonus_count as number) || 0,
            createdAt: d.created_at as string,
            updatedAt: d.updated_at as string,
            dueDate: d.due_date as string | undefined,
            deliveredAt: d.delivered_at as string | undefined,
          })) as Deliverable[];
        }
      }

      // Calculate totals
      const totalAssets = deliverables.reduce((sum, d) => sum + (d.count || 0), 0);
      const totalBonus = deliverables.reduce((sum, d) => sum + (d.bonusCount || 0), 0);
      addProgress(`Found ${deliverables.length} deliverables (${totalAssets} assets, ${totalBonus} bonus)`);

      // Build report title
      const periodLabel = `${startDisplay} - ${endDisplay}`;

      const clientLabel = filters.clientId === 'all'
        ? 'All Clients'
        : (selectedClient?.name || 'Unknown');

      // Generate enhanced report on Miro
      addProgress('Creating visual report with charts on Miro board...');
      addProgress('  - Building weekly breakdown...');
      addProgress('  - Creating bar charts...');
      addProgress('  - Creating project type breakdown...');

      const reportData = {
        clientName: `${clientLabel} - ${periodLabel}`,
        ...(selectedClient?.email ? { clientEmail: selectedClient.email } : {}),
        projects,
        deliverables,
        startDate,
        endDate,
        generatedAt: new Date().toISOString(),
        generatedBy: user?.name || user?.email || 'Admin',
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
      addProgress('  - Project type breakdown');
      setSuccess(true);

    } catch (err) {
      logger.error('Report generation failed', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
      addProgress(`ERROR: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

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

          {/* Period Presets */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Quick Select</label>
            <div className={styles.presetChips}>
              {PERIOD_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={styles.presetChip}
                  onClick={() => handlePresetClick(preset)}
                  disabled={isGenerating}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div className={styles.dateFilters}>
            <div className={styles.formGroup}>
              <label htmlFor="startDate" className={styles.label}>
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                className={styles.dateInput}
                disabled={isGenerating}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="endDate" className={styles.label}>
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                className={styles.dateInput}
                disabled={isGenerating}
              />
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
