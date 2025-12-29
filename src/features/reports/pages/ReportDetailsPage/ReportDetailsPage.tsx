import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@shared/ui';
import { supabase } from '@shared/lib/supabase';
import { reportPDFService } from '../../services/reportPDFService';
import { useReport, useReportMutations } from '../../hooks';

type DeliverableRow = {
  id: string;
  projectId: string;
  name: string;
  status: string;
  count: number;
  bonusCount: number;
  dueDate: string | null;
  deliveredAt: string | null;
  createdAt: string;
};

export function ReportDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: report, isLoading } = useReport(id ?? null);
  const { mutateAsync: incrementViewCount } = useReportMutations().incrementViewCount;
  const hasIncrementedRef = useRef(false);

  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [deliverablesError, setDeliverablesError] = useState<string | null>(null);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    if (!report || hasIncrementedRef.current) return;
    hasIncrementedRef.current = true;
    incrementViewCount(report.id).catch(() => undefined);
  }, [incrementViewCount, report]);

  const projectList = useMemo(() => {
    if (!report) return [];
    if (report.reportData?.scope === 'client' && report.reportData.projects?.length) {
      return report.reportData.projects;
    }
    const project = report.reportData?.project;
    if (!project) return [];
    return [
      {
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        dueDate: project.dueDate,
      },
    ];
  }, [report]);

  useEffect(() => {
    if (!report || projectList.length === 0) return;

    let isActive = true;
    const fetchDeliverables = async () => {
      setDeliverablesLoading(true);
      setDeliverablesError(null);
      try {
        const projectIds = projectList.map((project) => project.id);
        let query = supabase
          .from('deliverables')
          .select('id, project_id, name, status, count, bonus_count, due_date, delivered_at, created_at')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false });

        const dateRange = report.reportData?.dateRange;
        if (dateRange?.startDate && dateRange?.endDate) {
          const startIso = new Date(`${dateRange.startDate}T00:00:00`).toISOString();
          const endIso = new Date(`${dateRange.endDate}T23:59:59.999`).toISOString();
          query = query.gte('created_at', startIso).lte('created_at', endIso);
        }

        const { data, error } = await query;
        if (error) throw error;

        const mapped = (data || []).map((row: any) => ({
          id: row.id as string,
          projectId: row.project_id as string,
          name: row.name as string,
          status: row.status as string,
          count: row.count ?? 0,
          bonusCount: row.bonus_count ?? 0,
          dueDate: row.due_date ?? null,
          deliveredAt: row.delivered_at ?? null,
          createdAt: row.created_at as string,
        }));

        if (!isActive) return;
        setDeliverables(mapped);
      } catch (error) {
        if (!isActive) return;
        setDeliverablesError('Unable to load deliverables for this report.');
      } finally {
        if (isActive) setDeliverablesLoading(false);
      }
    };

    fetchDeliverables();

    return () => {
      isActive = false;
    };
  }, [projectList, report]);

  const deliverablesByProject = useMemo(() => {
    const completedStatuses = new Set(['approved', 'delivered']);
    const map = new Map<
      string,
      {
        items: DeliverableRow[];
        totals: { total: number; completed: number; assets: number; bonus: number };
      }
    >();

    projectList.forEach((project) => {
      map.set(project.id, {
        items: [],
        totals: { total: 0, completed: 0, assets: 0, bonus: 0 },
      });
    });

    deliverables.forEach((deliverable) => {
      const entry = map.get(deliverable.projectId);
      if (!entry) return;
      entry.items.push(deliverable);
      entry.totals.total += 1;
      entry.totals.assets += deliverable.count;
      entry.totals.bonus += deliverable.bonusCount;
      if (completedStatuses.has(deliverable.status)) {
        entry.totals.completed += 1;
      }
    });

    return map;
  }, [deliverables, projectList]);

  const handleDownload = async () => {
    if (!report) return;
    setDownloadError(null);
    try {
      const signedUrl = await reportPDFService.getDownloadURL(report.pdfUrl);
      window.open(signedUrl, '_blank');
    } catch (error) {
      window.open(report.pdfUrl, '_blank');
      setDownloadError('Unable to open the PDF for this report.');
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return <div style={{ padding: '24px' }}>Loading report...</div>;
  }

  if (!report) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Report not found.</p>
        <Button variant="ghost" onClick={() => navigate('/reports')}>
          Back to Reports
        </Button>
      </div>
    );
  }

  const { reportData } = report;
  const isClientReport = reportData?.scope === 'client';
  const clientLabel = reportData?.client?.companyName || reportData?.client?.name;
  const dateRange = reportData?.dateRange;
  const periodLabel =
    dateRange?.startDate && dateRange?.endDate
      ? `${formatDate(dateRange.startDate)} - ${formatDate(dateRange.endDate)}`
      : null;

  const metrics = reportData?.metrics;
  const metricCards = metrics
    ? [
        { label: 'Completion Rate', value: `${Math.round(metrics.completionRate || 0)}%` },
        { label: 'Total Deliverables', value: metrics.totalDeliverables ?? 0 },
        { label: 'Completed', value: metrics.completedDeliverables ?? 0 },
        { label: 'Pending', value: metrics.pendingDeliverables ?? 0 },
        { label: 'Total Assets', value: metrics.totalAssets ?? 0 },
        { label: 'Bonus Assets', value: metrics.totalBonusAssets ?? 0 },
        { label: 'Avg Approval Time', value: `${Math.round(metrics.averageApprovalTime || 0)} days` },
        { label: 'Total Feedback', value: metrics.totalFeedback ?? 0 },
        { label: 'Resolved Feedback', value: metrics.resolvedFeedback ?? 0 },
      ]
    : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '6px' }}>{report.title}</h1>
          <p style={{ color: '#6b7280', marginBottom: '4px' }}>
            {isClientReport
              ? `Client Report • ${clientLabel || 'Client'}`
              : `Project Report • ${report.project?.name || reportData?.project?.name}`}
          </p>
          <p style={{ color: '#6b7280' }}>
            Created: {formatDate(report.createdAt)}
            {periodLabel ? ` • Period: ${periodLabel}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="ghost" onClick={() => navigate('/reports')}>
            Back to Reports
          </Button>
          <Button onClick={handleDownload}>Download PDF</Button>
        </div>
      </div>

      {downloadError && (
        <div style={{ marginTop: '12px', color: '#dc2626', fontSize: '13px' }}>
          {downloadError}
        </div>
      )}

      {report.description && (
        <div style={{ marginTop: '16px', color: '#4b5563' }}>{report.description}</div>
      )}

      {metricCards.length > 0 && (
        <section style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Metrics</h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '12px',
            }}
          >
            {metricCards.map((metric) => (
              <div
                key={metric.label}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '12px',
                  background: '#fff',
                }}
              >
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                  {metric.label}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600 }}>{metric.value}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>
          {isClientReport ? 'Projects Included' : 'Project Details'}
        </h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          {projectList.map((project) => (
            <div
              key={project.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                padding: '12px',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontWeight: 600 }}>{project.name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  Status: {project.status.toUpperCase()}
                </div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '12px', color: '#6b7280' }}>
                Priority: {project.priority.toUpperCase()}
                {project.dueDate ? ` • Due: ${formatDate(project.dueDate)}` : ''}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: '28px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Deliverables</h2>
        {deliverablesLoading && <div style={{ color: '#6b7280' }}>Loading deliverables...</div>}
        {deliverablesError && <div style={{ color: '#dc2626' }}>{deliverablesError}</div>}
        {!deliverablesLoading && !deliverablesError && projectList.length === 0 && (
          <div style={{ color: '#6b7280' }}>No projects linked to this report.</div>
        )}
        {!deliverablesLoading && !deliverablesError && projectList.length > 0 && (
          <div style={{ display: 'grid', gap: '16px' }}>
            {projectList.map((project) => {
              const entry = deliverablesByProject.get(project.id);
              const items = entry?.items || [];
              const totals = entry?.totals || { total: 0, completed: 0, assets: 0, bonus: 0 };
              const previewItems = items.slice(0, 8);
              return (
                <div
                  key={project.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    padding: '12px',
                    background: '#fff',
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '8px' }}>{project.name}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
                    Deliverables: {totals.total} • Completed: {totals.completed} • Assets: {totals.assets}
                    {totals.bonus ? ` • Bonus: ${totals.bonus}` : ''}
                  </div>
                  {items.length === 0 ? (
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      No deliverables in this period.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '6px' }}>
                      {previewItems.map((deliverable) => (
                        <div
                          key={deliverable.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            fontSize: '12px',
                            color: '#374151',
                          }}
                        >
                          <span>{deliverable.name}</span>
                          <span style={{ color: '#6b7280' }}>{deliverable.status.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                      {items.length > previewItems.length && (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          + {items.length - previewItems.length} more deliverable
                          {items.length - previewItems.length === 1 ? '' : 's'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {reportData?.recentActivity?.length ? (
        <section style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Recent Activity</h2>
          <div style={{ display: 'grid', gap: '8px' }}>
            {reportData.recentActivity.slice(0, 10).map((activity, index) => (
              <div
                key={`${activity.id}-${index}`}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  padding: '10px',
                  fontSize: '12px',
                  color: '#4b5563',
                }}
              >
                {activity.itemName} • {activity.type.replace(/_/g, ' ')}
                {activity.userName ? ` • ${activity.userName}` : ''}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {reportData?.adminNotes ? (
        <section style={{ marginTop: '28px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Admin Notes</h2>
          <div
            style={{
              border: '1px solid #fcd34d',
              background: '#fff7ed',
              borderRadius: '10px',
              padding: '12px',
              color: '#92400e',
            }}
          >
            {reportData.adminNotes}
          </div>
        </section>
      ) : null}
    </div>
  );
}
