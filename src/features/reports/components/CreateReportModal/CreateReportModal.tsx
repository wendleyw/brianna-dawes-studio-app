import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Button } from '@shared/ui';
import { useProjects } from '@features/projects';
import { useUsers } from '@features/admin/hooks';
import { useMiro } from '@features/boards';
import { supabase } from '@shared/lib/supabase';
import { useCreateReport } from '../../hooks';
import type { ProjectReportType } from '../../domain/report.types';
import styles from './CreateReportModal.module.css';

interface CreateReportModalProps {
  open: boolean;
  onClose: () => void;
  defaultScope?: 'project' | 'client';
  lockScope?: 'project' | 'client';
  allowProjectScope?: boolean;
}

export function CreateReportModal({
  open,
  onClose,
  defaultScope = 'client',
  lockScope,
  allowProjectScope: allowProjectScopeProp,
}: CreateReportModalProps) {
  const allowProjectScope = allowProjectScopeProp ?? false;
  const initialScope = allowProjectScope ? (lockScope ?? defaultScope) : 'client';
  const [scope, setScope] = useState<'project' | 'client'>(initialScope);
  const [projectId, setProjectId] = useState('');
  const [projectClientId, setProjectClientId] = useState('');
  const [clientId, setClientId] = useState('');
  const [boardClientName, setBoardClientName] = useState<string | null>(null);
  const [boardClientId, setBoardClientId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [hasEditedTitle, setHasEditedTitle] = useState(false);
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<ProjectReportType>('project_summary');
  const [adminNotes, setAdminNotes] = useState('');
  const [startDate, setStartDate] = useState(() => getDefaultDateRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultDateRange().endDate);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  const { isInMiro, boardId, selectedProjectId } = useMiro();
  const { data: projects } = useProjects({ pageSize: 1000 });
  const { data: users } = useUsers();
  const { mutateAsync: createReport, isPending } = useCreateReport();
  const clients = useMemo(
    () => (users || []).filter((user) => user.role === 'client'),
    [users]
  );
  const effectiveClientId = clientId || boardClientId || '';
  const selectedClient = useMemo(
    () => clients.find((client) => client.id === effectiveClientId),
    [clients, effectiveClientId]
  );
  const defaultTitle = useMemo(() => {
    if (!effectiveClientId) return '';
    const clientLabel = selectedClient?.companyName || selectedClient?.name || boardClientName;
    if (!clientLabel) return '';
    const startLabel = startDate ? formatDateForLabel(startDate) : '';
    const endLabel = endDate ? formatDateForLabel(endDate) : '';
    const periodLabel = startLabel && endLabel ? `${startLabel} - ${endLabel}` : '';
    return periodLabel
      ? `Client Report — ${clientLabel} (${periodLabel})`
      : `Client Report — ${clientLabel}`;
  }, [boardClientName, effectiveClientId, endDate, selectedClient, startDate]);
  const filteredProjects = useMemo(() => {
    const list = projects?.data || [];
    if (!projectClientId) return list;
    return list.filter((project: any) => {
      const projectClient = project.clientId || project.client_id;
      return projectClient === projectClientId;
    });
  }, [projects?.data, projectClientId]);
  const isSubmitting = isPending || isBatchSubmitting;
  const lockToClientScope =
    !allowProjectScope || lockScope === 'client' || (!!boardClientId && lockScope !== 'project');

  const resetForm = useCallback(() => {
    setProjectId('');
    setProjectClientId('');
    setClientId('');
    setTitle('');
    setHasEditedTitle(false);
    setDescription('');
    setAdminNotes('');
    setStartDate(getDefaultDateRange().startDate);
    setEndDate(getDefaultDateRange().endDate);
    setBatchProgress(null);
    setSubmitError(null);
    setScope(allowProjectScope ? (lockScope ?? defaultScope) : 'client');
    setBoardClientName(null);
    setBoardClientId(null);
  }, [allowProjectScope, defaultScope, lockScope]);

  useEffect(() => {
    if (!allowProjectScope) {
      setScope('client');
      return;
    }
    if (!lockScope) return;
    setScope(lockScope);
  }, [allowProjectScope, lockScope]);

  useEffect(() => {
    if (!lockToClientScope) return;
    if (scope !== 'client') {
      setScope('client');
    }
  }, [lockToClientScope, scope]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  useEffect(() => {
    if (!open) return;
    if (hasEditedTitle) return;
    if (!title && defaultTitle) {
      setTitle(defaultTitle);
    }
  }, [defaultTitle, hasEditedTitle, open, title]);

  useEffect(() => {
    if (!open || !isInMiro) return;
    if (!boardId && !selectedProjectId) return;

    let isActive = true;

    const fetchBoardClient = async () => {
      try {
        if (selectedProjectId) {
          const { data, error } = await supabase
            .from('projects')
            .select('client_id, client:users!client_id(id, name, company_name)')
            .eq('id', selectedProjectId)
            .maybeSingle();

          if (error || !data?.client_id) return;
          if (!isActive) return;
          const clientRecord = Array.isArray(data.client) ? data.client[0] : data.client;
          setBoardClientId(data.client_id);
          setBoardClientName(clientRecord?.company_name || clientRecord?.name || null);
          return;
        }

        const { data, error } = await supabase
          .from('projects')
          .select('client_id, client:users!client_id(id, name, company_name)')
          .eq('miro_board_id', boardId);

        if (error || !data || data.length === 0) return;
        const uniqueClients = new Map<string, { name: string | null }>();
        data.forEach((project: any) => {
          if (!project.client_id || uniqueClients.has(project.client_id)) return;
          const clientRecord = Array.isArray(project.client) ? project.client[0] : project.client;
          uniqueClients.set(project.client_id, {
            name: clientRecord?.company_name || clientRecord?.name || null,
          });
        });

        if (uniqueClients.size !== 1) return;
        const [clientEntry] = uniqueClients.entries();
        if (!clientEntry) return;
        const [cId, clientMeta] = clientEntry;
        if (!isActive) return;
        setBoardClientId(cId);
        setBoardClientName(clientMeta.name);
      } catch (error) {
        console.error('Failed to infer board client', error);
      }
    };

    fetchBoardClient();

    return () => {
      isActive = false;
    };
  }, [open, isInMiro, boardId, selectedProjectId]);

  useEffect(() => {
    if (!boardClientId) return;

    if (scope === 'client') {
      if (!clientId) {
        setClientId(boardClientId);
      }
      return;
    }

    if (!projectClientId) {
      setProjectClientId(boardClientId);
    }
  }, [boardClientId, clientId, projectClientId, scope]);

  useEffect(() => {
    if (!projectId) return;
    if (scope !== 'project') return;
    const isValid = filteredProjects.some((project: any) => project.id === projectId);
    if (!isValid) {
      setProjectId('');
    }
  }, [filteredProjects, projectId, scope]);

  const handleSubmit = async () => {
    setSubmitError(null);
    setBatchProgress(null);

    if ((!title && !defaultTitle) || !startDate || !endDate) return;

    if (scope === 'project' && !projectId) return;
    if (scope === 'client' && !effectiveClientId) return;

    const effectiveTitle = title || defaultTitle;
    const baseInput: any = { title: effectiveTitle, reportType, startDate, endDate };
    if (description) baseInput.description = description;
    if (adminNotes) baseInput.adminNotes = adminNotes;

    if (scope === 'project') {
      try {
        await createReport({ ...baseInput, projectId });
        resetForm();
        onClose();
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to create report');
      }
      return;
    }

    setIsBatchSubmitting(true);
    setBatchProgress('Loading client projects...');

    try {
      let projectsQuery = supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('client_id', effectiveClientId)
        .order('created_at', { ascending: false });

      if (isInMiro && boardId) {
        projectsQuery = projectsQuery.eq('miro_board_id', boardId);
      }

      const { data, error } = await projectsQuery;

      if (error) throw error;
      const projectsData = data || [];
      if (projectsData.length === 0) {
        throw new Error('No projects found for this client');
      }

      const primaryProject = projectsData[0]!;
      const projectIds = projectsData.map((project) => project.id);
      const clientLabel = selectedClient?.companyName || selectedClient?.name || boardClientName;
      const reportTitle = clientLabel && !effectiveTitle.includes(clientLabel)
        ? `${effectiveTitle} — ${clientLabel}`
        : effectiveTitle;

      setBatchProgress('Generating client report...');

      await createReport({
        ...baseInput,
        projectId: primaryProject.id,
        title: reportTitle,
        scope: 'client',
        clientId: effectiveClientId,
        projectIds,
      });

      setBatchProgress('Client report generated.');
      resetForm();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create report');
    } finally {
      setIsBatchSubmitting(false);
    }
  };

  const presets = useMemo(
    () => [
      { label: 'This Month', getValue: getThisMonthRange },
      { label: 'Last Month', getValue: getLastMonthRange },
      { label: 'This Year', getValue: getThisYearRange },
      { label: 'Last Year', getValue: getLastYearRange },
    ],
    []
  );

  const canSubmit =
    (!!title || !!defaultTitle) &&
    !!startDate &&
    !!endDate &&
    (scope === 'project' ? !!projectId : !!effectiveClientId) &&
    !isSubmitting;

  const dialogTitle =
    lockToClientScope || scope === 'client' ? 'Create Client Report' : 'Create Project Report';

  return (
    <Dialog open={open} onClose={onClose} title={dialogTitle} size="lg">
      <div className={styles.form}>
        {/* Scope Selection */}
        {!lockToClientScope ? (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Report Scope</label>
            <div className={styles.scopeButtons}>
              <button
                type="button"
                className={`${styles.scopeBtn} ${scope === 'project' ? styles.scopeBtnActive : ''}`}
                onClick={() => setScope('project')}
              >
                Single Project
              </button>
              <button
                type="button"
                className={`${styles.scopeBtn} ${scope === 'client' ? styles.scopeBtnActive : ''}`}
                onClick={() => setScope('client')}
              >
                Client (All Projects)
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Report Scope</label>
            <div className={styles.scopeInfo}>Client (All Projects)</div>
          </div>
        )}

        {/* Project Selection */}
        {scope === 'project' && !lockToClientScope && (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Project *</label>
            <select
              value={projectClientId}
              onChange={(e) => setProjectClientId(e.target.value)}
              className={`${styles.select} ${styles.selectSpaced}`}
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName || client.name}
                </option>
              ))}
            </select>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className={styles.select}
            >
              <option value="">Select a project</option>
              {filteredProjects.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Client Selection */}
        {scope === 'client' && (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Client *</label>
            {lockToClientScope && boardClientId ? (
              <div className={styles.clientLocked}>
                {boardClientName || selectedClient?.companyName || selectedClient?.name || 'Client from board'}
              </div>
            ) : (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={styles.select}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName || client.name}
                  </option>
                ))}
              </select>
            )}
            {lockToClientScope && boardClientId && (
              <p className={styles.hint}>Client is locked to this board.</p>
            )}
            {boardClientName && (
              <p className={styles.hint}>Board client detected: {boardClientName}</p>
            )}
            <p className={styles.hint}>
              Generates a single report covering all projects for the selected client.
            </p>
          </div>
        )}

        {/* Title */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Report Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setHasEditedTitle(true);
              setTitle(e.target.value);
            }}
            placeholder={defaultTitle || 'Monthly Progress Report'}
            className={styles.input}
          />
        </div>

        {/* Description */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={styles.textarea}
          />
        </div>

        {/* Report Type */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ProjectReportType)}
            className={styles.select}
          >
            <option value="project_summary">Project Summary</option>
            <option value="milestone">Milestone Report</option>
            <option value="final">Final Report</option>
          </select>
        </div>

        {/* Date Range */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Report Period</label>
          <div className={styles.presetButtons}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                className={styles.presetBtn}
                onClick={() => {
                  const range = preset.getValue();
                  setStartDate(range.startDate);
                  setEndDate(range.endDate);
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className={styles.dateRow}>
            <div className={styles.dateCol}>
              <label className={styles.labelSmall}>Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.dateCol}>
              <label className={styles.labelSmall}>End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Admin Notes</label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes to include in the report..."
            className={styles.textarea}
          />
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            isLoading={isSubmitting}
          >
            {scope === 'client' ? 'Generate Client Report' : 'Generate & Send Report'}
          </Button>
        </div>

        {batchProgress && (
          <div className={styles.progressMessage}>{batchProgress}</div>
        )}
        {submitError && (
          <div className={styles.errorMessage}>{submitError}</div>
        )}
      </div>
    </Dialog>
  );
}

function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForLabel(dateStr: string): string {
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDefaultDateRange(): { startDate: string; endDate: string } {
  return getThisMonthRange();
}

function getThisMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    startDate: formatDateForInput(start),
    endDate: formatDateForInput(end),
  };
}

function getLastMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    startDate: formatDateForInput(start),
    endDate: formatDateForInput(end),
  };
}

function getThisYearRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return {
    startDate: formatDateForInput(start),
    endDate: formatDateForInput(end),
  };
}

function getLastYearRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const end = new Date(now.getFullYear() - 1, 11, 31);
  return {
    startDate: formatDateForInput(start),
    endDate: formatDateForInput(end),
  };
}
