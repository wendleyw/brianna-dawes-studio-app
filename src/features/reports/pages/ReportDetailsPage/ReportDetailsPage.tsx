import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@shared/ui';
import { supabase } from '@shared/lib/supabase';
import { reportPDFService } from '../../services/reportPDFService';
import { useReport, useReportMutations } from '../../hooks';
import styles from './ReportDetailsPage.module.css';

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
    return <div className={styles.state}>Loading report...</div>;
  }

  if (!report) {
    return (
      <div className={styles.state}>
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
  const completionRate = Math.max(0, Math.min(100, metrics?.completionRate || 0));
  const feedbackRate =
    metrics?.totalFeedback && metrics.totalFeedback > 0
      ? Math.round((metrics.resolvedFeedback / metrics.totalFeedback) * 100)
      : 0;
  const deliverableTotal = metrics?.totalDeliverables ?? 0;
  const deliverableCompleted = metrics?.completedDeliverables ?? 0;
  const deliverablePending = metrics?.pendingDeliverables ?? 0;
  const deliverablePendingRate =
    deliverableTotal > 0 ? Math.round((deliverablePending / deliverableTotal) * 100) : 0;
  const totalAssets = metrics?.totalAssets ?? 0;
  const bonusAssets = metrics?.totalBonusAssets ?? 0;
  const assetsTotal = totalAssets + bonusAssets;
  const bonusRate = assetsTotal > 0 ? Math.round((bonusAssets / assetsTotal) * 100) : 0;
  const assetsRate = assetsTotal > 0 ? Math.round((totalAssets / assetsTotal) * 100) : 0;
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

  const formatStatus = (value?: string | null) =>
    value ? value.replace(/_/g, ' ').toUpperCase() : 'N/A';

  const getStatusClass = (value?: string | null) => {
    const status = value?.toLowerCase() || '';
    if (['approved', 'delivered', 'completed'].includes(status)) {
      return `${styles.statusBadge} ${styles.statusPositive}`;
    }
    if (['rejected', 'overdue', 'blocked'].includes(status)) {
      return `${styles.statusBadge} ${styles.statusNegative}`;
    }
    if (['in_review', 'in_progress', 'pending'].includes(status)) {
      return `${styles.statusBadge} ${styles.statusWarning}`;
    }
    return `${styles.statusBadge} ${styles.statusNeutral}`;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroHeader}>
            <div>
              <p className={styles.heroEyebrow}>
                {isClientReport ? 'Client Report' : 'Project Report'}
              </p>
              <h1 className={styles.heroTitle}>{report.title}</h1>
              <p className={styles.heroSubtitle}>
                {isClientReport
                  ? `For ${clientLabel || 'your client'}`
                  : `For ${report.project?.name || reportData?.project?.name}`}
              </p>
            </div>
            <div className={styles.heroActions}>
              <Button variant="ghost" onClick={() => navigate('/reports')}>
                Back to Reports
              </Button>
              <Button onClick={handleDownload}>Download PDF</Button>
            </div>
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.metaPill}>Created {formatDate(report.createdAt)}</span>
            {periodLabel && <span className={styles.metaPill}>Period {periodLabel}</span>}
            <span className={styles.metaPill}>
              {projectList.length} project{projectList.length === 1 ? '' : 's'} included
            </span>
          </div>
          {downloadError && <div className={styles.alert}>{downloadError}</div>}
        </section>

        {report.description && <div className={styles.description}>{report.description}</div>}

        {metricCards.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Metrics Overview</h2>
              <p>Performance, delivery volume, and feedback health for this reporting period.</p>
            </div>
            <div className={styles.kpiGrid}>
              {metricCards.map((metric) => (
                <div key={metric.label} className={styles.kpiCard}>
                  <div className={styles.kpiLabel}>{metric.label}</div>
                  <div className={styles.kpiValue}>{metric.value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Report Highlights</h2>
            <p>Key trends and totals pulled from deliverables and feedback.</p>
          </div>
          <div className={styles.chartGrid}>
            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>Delivery Progress</h3>
                  <p>{deliverableCompleted} delivered out of {deliverableTotal} items.</p>
                </div>
                <span className={styles.chartValue}>{completionRate}%</span>
              </div>
              <div className={styles.progressTrack} aria-label="Completion rate">
                <div className={styles.progressFill} style={{ width: `${completionRate}%` }} />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>Deliverable Status</h3>
                  <p>Pending work vs approved content.</p>
                </div>
                <span className={styles.chartValue}>{deliverablePending} pending</span>
              </div>
              <div className={styles.stackTrack} aria-label="Deliverable status">
                <div className={styles.stackFillPrimary} style={{ width: `${100 - deliverablePendingRate}%` }} />
                <div className={styles.stackFillMuted} style={{ width: `${deliverablePendingRate}%` }} />
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatchPrimary} />
                  Completed ({deliverableCompleted})
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatchMuted} />
                  Pending ({deliverablePending})
                </span>
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>Asset Mix</h3>
                  <p>Core assets vs bonus items delivered.</p>
                </div>
                <span className={styles.chartValue}>{assetsTotal}</span>
              </div>
              <div className={styles.stackTrack} aria-label="Asset mix">
                <div className={styles.stackFillPrimary} style={{ width: `${assetsRate}%` }} />
                <div className={styles.stackFillAccent} style={{ width: `${bonusRate}%` }} />
              </div>
              <div className={styles.legendRow}>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatchPrimary} />
                  Assets ({totalAssets})
                </span>
                <span className={styles.legendItem}>
                  <span className={styles.legendSwatchAccent} />
                  Bonus ({bonusAssets})
                </span>
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>Feedback Resolution</h3>
                  <p>Resolved vs open feedback threads.</p>
                </div>
                <span className={styles.chartValue}>{feedbackRate}%</span>
              </div>
              <div className={styles.progressTrack} aria-label="Feedback resolution">
                <div className={styles.progressFill} style={{ width: `${feedbackRate}%` }} />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{isClientReport ? 'Projects Included' : 'Project Details'}</h2>
            <p>All projects counted in this report.</p>
          </div>
          <div className={styles.projectGrid}>
            {projectList.map((project) => (
              <div key={project.id} className={styles.projectCard}>
                <div className={styles.projectHeader}>
                  <div>
                    <h3>{project.name}</h3>
                    <p>Priority {formatStatus(project.priority)}</p>
                  </div>
                  <span className={getStatusClass(project.status)}>{formatStatus(project.status)}</span>
                </div>
                <div className={styles.projectMeta}>
                  <span>Start {formatDate(project.startDate)}</span>
                  <span>Due {formatDate(project.dueDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Deliverables</h2>
            <p>Quick snapshot by project with status and totals.</p>
          </div>
          {deliverablesLoading && <div className={styles.stateSmall}>Loading deliverables...</div>}
          {deliverablesError && <div className={styles.alert}>{deliverablesError}</div>}
          {!deliverablesLoading && !deliverablesError && projectList.length === 0 && (
            <div className={styles.stateSmall}>No projects linked to this report.</div>
          )}
          {!deliverablesLoading && !deliverablesError && projectList.length > 0 && (
            <div className={styles.deliverablesGrid}>
              {projectList.map((project) => {
                const entry = deliverablesByProject.get(project.id);
                const items = entry?.items || [];
                const totals = entry?.totals || { total: 0, completed: 0, assets: 0, bonus: 0 };
                const previewItems = items.slice(0, 8);
                const completion =
                  totals.total > 0 ? Math.round((totals.completed / totals.total) * 100) : 0;
                return (
                  <div key={project.id} className={styles.deliverableCard}>
                    <div className={styles.deliverableHeader}>
                      <div>
                        <h3>{project.name}</h3>
                        <p>
                          {totals.total} deliverable{totals.total === 1 ? '' : 's'} • {totals.assets} assets
                          {totals.bonus ? ` • ${totals.bonus} bonus` : ''}
                        </p>
                      </div>
                      <span className={styles.chartValue}>{completion}%</span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div className={styles.progressFill} style={{ width: `${completion}%` }} />
                    </div>
                    {items.length === 0 ? (
                      <div className={styles.stateSmall}>No deliverables in this period.</div>
                    ) : (
                      <div className={styles.deliverableList}>
                        {previewItems.map((deliverable) => (
                          <div key={deliverable.id} className={styles.deliverableRow}>
                            <span>{deliverable.name}</span>
                            <span className={getStatusClass(deliverable.status)}>
                              {formatStatus(deliverable.status)}
                            </span>
                          </div>
                        ))}
                        {items.length > previewItems.length && (
                          <div className={styles.stateSmall}>
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
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Recent Activity</h2>
              <p>Latest updates contributing to this report.</p>
            </div>
            <div className={styles.activityList}>
              {reportData.recentActivity.slice(0, 10).map((activity, index) => (
                <div key={`${activity.id}-${index}`} className={styles.activityItem}>
                  <span className={styles.activityDot} />
                  <div>
                    <div>{activity.itemName}</div>
                    <div className={styles.activityMeta}>
                      {activity.type.replace(/_/g, ' ')}
                      {activity.userName ? ` • ${activity.userName}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {reportData?.adminNotes ? (
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Admin Notes</h2>
              <p>Additional context from the team.</p>
            </div>
            <div className={styles.notesBox}>{reportData.adminNotes}</div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
