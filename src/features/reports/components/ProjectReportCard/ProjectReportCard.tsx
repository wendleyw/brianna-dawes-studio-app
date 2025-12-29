import { Button } from '@shared/ui';
import type { ProjectReport } from '../../domain/report.types';

interface ProjectReportCardProps {
  report: ProjectReport;
  onView: () => void;
}

export function ProjectReportCard({ report, onView }: ProjectReportCardProps) {
  const isNew = report.viewCount === 0;
  const fileSize = report.fileSizeBytes
    ? `${(report.fileSizeBytes / 1024).toFixed(0)} KB`
    : '';

  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: isNew ? '#F0F9FF' : 'white',
      }}
    >
      {isNew && (
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#2563EB',
            color: 'white',
            marginBottom: '12px',
          }}
        >
          NEW
        </span>
      )}

      <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
        {report.title}
      </h3>

      {report.description && (
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
          {report.description}
        </p>
      )}

      <div style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
        {report.reportData?.scope === 'client' ? (
          <>
            <div>
              Client: {report.reportData.client?.companyName || report.reportData.client?.name || 'Client'}
            </div>
            <div>
              Projects: {report.reportData.projects?.length ?? 0}
            </div>
          </>
        ) : (
          <div>Project: {report.project?.name}</div>
        )}
        <div>
          Sent: {new Date(report.sentAt || report.createdAt).toLocaleDateString()}
        </div>
        {fileSize && <div>Size: {fileSize}</div>}
      </div>

      <Button onClick={onView} style={{ width: '100%' }}>
        Download Report PDF
      </Button>
    </div>
  );
}
