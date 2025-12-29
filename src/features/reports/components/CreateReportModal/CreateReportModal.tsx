import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, Button } from '@shared/ui';
import { useProjects } from '@features/projects';
import { useUsers } from '@features/admin/hooks';
import { supabase } from '@shared/lib/supabase';
import { useCreateReport } from '../../hooks';
import type { ProjectReportType } from '../../domain/report.types';

interface CreateReportModalProps {
  open: boolean;
  onClose: () => void;
  defaultScope?: 'project' | 'client';
}

export function CreateReportModal({
  open,
  onClose,
  defaultScope = 'client',
}: CreateReportModalProps) {
  const [scope, setScope] = useState<'project' | 'client'>(defaultScope);
  const [projectId, setProjectId] = useState('');
  const [projectClientId, setProjectClientId] = useState('');
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<ProjectReportType>('project_summary');
  const [adminNotes, setAdminNotes] = useState('');
  const [startDate, setStartDate] = useState(() => getDefaultDateRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultDateRange().endDate);
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isBatchSubmitting, setIsBatchSubmitting] = useState(false);

  const { data: projects } = useProjects({ pageSize: 1000 });
  const { data: users } = useUsers();
  const { mutateAsync: createReport, isPending } = useCreateReport();
  const clients = useMemo(
    () => (users || []).filter((user) => user.role === 'client'),
    [users]
  );
  const filteredProjects = useMemo(() => {
    const list = projects?.data || [];
    if (!projectClientId) return list;
    return list.filter((project: any) => {
      const projectClient = project.clientId || project.client_id;
      return projectClient === projectClientId;
    });
  }, [projects?.data, projectClientId]);
  const isSubmitting = isPending || isBatchSubmitting;

  const resetForm = useCallback(() => {
    setProjectId('');
    setProjectClientId('');
    setClientId('');
    setTitle('');
    setDescription('');
    setAdminNotes('');
    setStartDate(getDefaultDateRange().startDate);
    setEndDate(getDefaultDateRange().endDate);
    setBatchProgress(null);
    setSubmitError(null);
    setScope(defaultScope);
  }, [defaultScope]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

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

    if (!title || !startDate || !endDate) return;

    if (scope === 'project' && !projectId) return;
    if (scope === 'client' && !clientId) return;

    const baseInput: any = { title, reportType, startDate, endDate };
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
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('No projects found for this client');
      }

      const primaryProject = data[0];
      const projectIds = data.map((project) => project.id);
      const selectedClient = clients.find((client) => client.id === clientId);
      const reportTitle = selectedClient?.companyName
        ? `${title} — ${selectedClient.companyName}`
        : selectedClient?.name
        ? `${title} — ${selectedClient.name}`
        : title;

      setBatchProgress('Generating client report...');

      await createReport({
        ...baseInput,
        projectId: primaryProject.id,
        title: reportTitle,
        scope: 'client',
        clientId,
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

  const dialogTitle = scope === 'client' ? 'Create Client Report' : 'Create Project Report';

  return (
    <Dialog open={open} onClose={onClose} title={dialogTitle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Report Scope (default: Client)
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setScope('project')}
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: scope === 'project' ? '1px solid #2563EB' : '1px solid #ddd',
                background: scope === 'project' ? '#EFF6FF' : '#fff',
                color: scope === 'project' ? '#1D4ED8' : '#111827',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Single Project
            </button>
            <button
              type="button"
              onClick={() => setScope('client')}
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: scope === 'client' ? '1px solid #2563EB' : '1px solid #ddd',
                background: scope === 'client' ? '#EFF6FF' : '#fff',
                color: scope === 'client' ? '#1D4ED8' : '#111827',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Client (All Projects)
            </button>
          </div>
        </div>

        {scope === 'project' && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Project *
            </label>
            <select
              value={projectClientId}
              onChange={(e) => setProjectClientId(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', marginBottom: '8px' }}
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
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
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

        {scope === 'client' && (
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
              Client *
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.companyName || client.name}
                </option>
              ))}
            </select>
            <p style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
              Generates a single report covering all projects for the selected client.
            </p>
          </div>
        )}

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Report Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Monthly Progress Report"
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ProjectReportType)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="project_summary">Project Summary</option>
            <option value="milestone">Milestone Report</option>
            <option value="final">Final Report</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
            Report Period
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  const range = preset.getValue();
                  setStartDate(range.startDate);
                  setEndDate(range.endDate);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '999px',
                  border: '1px solid #ddd',
                  background: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
                Start
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: '#666' }}>
                End
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Admin Notes
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            rows={3}
            placeholder="Additional notes to include in the report..."
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              !title ||
              !startDate ||
              !endDate ||
              (scope === 'project' && !projectId) ||
              (scope === 'client' && !clientId) ||
              isSubmitting
            }
            isLoading={isSubmitting}
          >
            {scope === 'client' ? 'Generate Client Report' : 'Generate & Send Report'}
          </Button>
        </div>
        {batchProgress && (
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>
            {batchProgress}
          </div>
        )}
        {submitError && (
          <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '8px' }}>
            {submitError}
          </div>
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
