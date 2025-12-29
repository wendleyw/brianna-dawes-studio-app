import { useMemo, useState } from 'react';
import { Dialog, Button } from '@shared/ui';
import { useProjects } from '@features/projects';
import { useCreateReport } from '../../hooks';
import type { ProjectReportType } from '../../domain/report.types';

interface CreateReportModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateReportModal({ open, onClose }: CreateReportModalProps) {
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reportType, setReportType] = useState<ProjectReportType>('project_summary');
  const [adminNotes, setAdminNotes] = useState('');
  const [startDate, setStartDate] = useState(() => getDefaultDateRange().startDate);
  const [endDate, setEndDate] = useState(() => getDefaultDateRange().endDate);

  const { data: projects } = useProjects({ pageSize: 1000 });
  const { mutate: createReport, isPending } = useCreateReport();

  const handleSubmit = () => {
    if (!projectId || !title) return;

    const input: any = { projectId, title, reportType, startDate, endDate };
    if (description) input.description = description;
    if (adminNotes) input.adminNotes = adminNotes;

    createReport(input, {
      onSuccess: () => {
        setProjectId('');
        setTitle('');
        setDescription('');
        setAdminNotes('');
        setStartDate(getDefaultDateRange().startDate);
        setEndDate(getDefaultDateRange().endDate);
        onClose();
      },
    });
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

  return (
    <Dialog open={open} onClose={onClose} title="Create Project Report">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '400px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500' }}>
            Project *
          </label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          >
            <option value="">Select a project</option>
            {projects?.data?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

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
            disabled={!projectId || !title || !startDate || !endDate || isPending}
            isLoading={isPending}
          >
            Generate & Send Report
          </Button>
        </div>
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
