import { useState } from 'react';
import { Button } from '@shared/ui';
import { useReports, useReportMutations } from '@features/reports/hooks';
import { CreateReportModal } from '@features/reports/components/CreateReportModal';
import { reportPDFService } from '@features/reports/services/reportPDFService';

export default function ReportsTab() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: reports, isLoading } = useReports();
  const { mutate: deleteReport, isPending: isDeleting } = useReportMutations().deleteReport;

  const handleDownload = async (pdfUrl: string) => {
    try {
      const signedUrl = await reportPDFService.getDownloadURL(pdfUrl);
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to open report PDF', error);
      window.open(pdfUrl, '_blank');
    }
  };

  const handleDelete = (report: any) => {
    if (confirm(`Delete report "${report.title}"?`)) {
      deleteReport({ id: report.id, pdfUrl: report.pdfUrl });
    }
  };

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading reports...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            Reports
          </h2>
          <p style={{ color: '#666' }}>Generate and send client reports</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>Create Report</Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {reports?.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: '#999',
              border: '2px dashed #ddd',
              borderRadius: '8px',
            }}
          >
            No reports created yet. Create your first report to get started.
          </div>
        ) : (
          reports?.map((report) => (
            <div
              key={report.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                  {report.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  {report.reportData?.scope === 'client'
                    ? `Client: ${report.reportData.client?.companyName || report.reportData.client?.name || 'Client'}`
                    : report.project?.name}
                  {' • '}
                  {report.reportType.replace(/_/g, ' ')} •{' '}
                  {new Date(report.createdAt).toLocaleDateString()}
                </p>
                <div style={{ marginTop: '8px', display: 'flex', gap: '12px' }}>
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor:
                        report.status === 'viewed'
                          ? '#10B981'
                          : report.status === 'sent'
                          ? '#2563EB'
                          : '#999',
                      color: 'white',
                    }}
                  >
                    {report.status.toUpperCase()}
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {report.viewCount} view{report.viewCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(report.pdfUrl)}
                >
                  Download PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(report)}
                  disabled={isDeleting}
                  style={{ color: '#EF4444' }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateReportModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        defaultScope="client"
        lockScope="client"
      />
    </div>
  );
}
