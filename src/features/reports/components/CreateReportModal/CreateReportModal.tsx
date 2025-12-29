import { useState } from 'react';
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

  const { data: projects } = useProjects({ pageSize: 1000 });
  const { mutate: createReport, isPending } = useCreateReport();

  const handleSubmit = () => {
    if (!projectId || !title) return;

    const input: any = { projectId, title, reportType };
    if (description) input.description = description;
    if (adminNotes) input.adminNotes = adminNotes;

    createReport(input, {
      onSuccess: () => {
        setProjectId('');
        setTitle('');
        setDescription('');
        setAdminNotes('');
        onClose();
      },
    });
  };

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
            disabled={!projectId || !title || isPending}
            isLoading={isPending}
          >
            Generate & Send Report
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
