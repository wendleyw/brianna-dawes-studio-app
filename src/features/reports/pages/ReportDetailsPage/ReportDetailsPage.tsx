import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@shared/ui';
import { supabase } from '@shared/lib/supabase';
import { useReport, useReportMutations } from '../../hooks';
import { DeliveryTrendChart } from '../../components/charts/DeliveryTrendChart';
import { StatusDistributionChart } from '../../components/charts/StatusDistributionChart';
import { AssetsByProjectChart } from '../../components/charts/AssetsByProjectChart';
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

type PeriodBucket = {
  label: string;
  assets: number;
  bonus: number;
  total: number;
  deliverables: number;
  completed: number;
};

const COMPLETED_STATUSES = new Set(['approved', 'delivered', 'completed']);
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getDaysBetween(startDate: Date, endDate: Date) {
  return Math.ceil((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function formatWeekLabel(startDate: Date, endDate: Date) {
  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

function getWeeksInRange(startDate: Date, endDate: Date) {
  const weeks: Array<{ start: Date; end: Date; label: string }> = [];
  const currentStart = new Date(startDate);
  currentStart.setDate(currentStart.getDate() - currentStart.getDay());

  while (currentStart <= endDate) {
    const weekEnd = new Date(currentStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    weeks.push({
      start: new Date(currentStart),
      end: weekEnd > endDate ? new Date(endDate) : weekEnd,
      label: formatWeekLabel(currentStart, weekEnd > endDate ? endDate : weekEnd),
    });

    currentStart.setDate(currentStart.getDate() + 7);
  }

  return weeks;
}

function getMonthsInRange(startDate: Date, endDate: Date) {
  const months: Array<{ start: Date; end: Date; label: string }> = [];
  const currentStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (currentStart <= endDate) {
    const monthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0);
    const label = currentStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    months.push({
      start: new Date(currentStart),
      end: monthEnd > endDate ? new Date(endDate) : monthEnd,
      label,
    });

    currentStart.setMonth(currentStart.getMonth() + 1);
  }

  return months;
}

function getDeliverablePeriodDate(deliverable: DeliverableRow) {
  if (deliverable.deliveredAt) {
    return new Date(deliverable.deliveredAt);
  }
  if (deliverable.dueDate) {
    return new Date(deliverable.dueDate);
  }
  return new Date(deliverable.createdAt);
}

export function ReportDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: report, isLoading } = useReport(id ?? null);
  const { mutateAsync: incrementViewCount } = useReportMutations().incrementViewCount;
  const hasIncrementedRef = useRef(false);

  const [deliverables, setDeliverables] = useState<DeliverableRow[]>([]);
  const [deliverablesError, setDeliverablesError] = useState<string | null>(null);
  const [deliverablesLoading, setDeliverablesLoading] = useState(false);

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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const reportData = report?.reportData;
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
  const totalAssets = metrics?.totalAssets ?? 0;
  const bonusAssets = metrics?.totalBonusAssets ?? 0;
  const assetsTotal = totalAssets + bonusAssets;
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

  const deliverableStatusSummary = useMemo(() => {
    const counts = {
      completed: 0,
      inReview: 0,
      inProgress: 0,
      pending: 0,
      rejected: 0,
    };

    deliverables.forEach((deliverable) => {
      const status = deliverable.status.toLowerCase();
      if (['approved', 'delivered', 'completed'].includes(status)) {
        counts.completed += 1;
      } else if (status === 'in_review') {
        counts.inReview += 1;
      } else if (status === 'in_progress') {
        counts.inProgress += 1;
      } else if (status === 'rejected') {
        counts.rejected += 1;
      } else {
        counts.pending += 1;
      }
    });

    return [
      { label: 'Completed', value: counts.completed, color: '#0f766e' },
      { label: 'In Review', value: counts.inReview, color: '#f59e0b' },
      { label: 'In Progress', value: counts.inProgress, color: '#3b82f6' },
      { label: 'Pending', value: counts.pending, color: '#94a3b8' },
      { label: 'Rejected', value: counts.rejected, color: '#ef4444' },
    ];
  }, [deliverables]);

  const assetsByProject = useMemo(() => {
    return projectList
      .map((project) => {
        const totals = deliverablesByProject.get(project.id)?.totals;
        const assets = totals?.assets ?? 0;
        const bonus = totals?.bonus ?? 0;
        return {
          id: project.id,
          name: project.name,
          assets,
          bonus,
          total: assets + bonus,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [deliverablesByProject, projectList]);

  const periodSummary = useMemo(() => {
    if (!dateRange?.startDate || !dateRange?.endDate) {
      return { buckets: [] as PeriodBucket[], isMonthly: false };
    }

    const startDate = new Date(`${dateRange.startDate}T00:00:00`);
    const endDate = new Date(`${dateRange.endDate}T23:59:59.999`);
    const daysBetween = getDaysBetween(startDate, endDate);
    const useMonthly = daysBetween > 90;
    const ranges = useMonthly ? getMonthsInRange(startDate, endDate) : getWeeksInRange(startDate, endDate);

    const buckets = ranges.map((range) => {
      let assets = 0;
      let bonus = 0;
      let deliverableCount = 0;
      let completedCount = 0;

      deliverables.forEach((deliverable) => {
        const periodDate = getDeliverablePeriodDate(deliverable);
        if (periodDate < range.start || periodDate > range.end) return;
        assets += deliverable.count || 0;
        bonus += deliverable.bonusCount || 0;
        deliverableCount += 1;
        if (COMPLETED_STATUSES.has(deliverable.status.toLowerCase())) {
          completedCount += 1;
        }
      });

      return {
        label: range.label,
        assets,
        bonus,
        total: assets + bonus,
        deliverables: deliverableCount,
        completed: completedCount,
      };
    });

    const maxBuckets = useMonthly ? 6 : 8;
    const trimmed = buckets.length > maxBuckets ? buckets.slice(buckets.length - maxBuckets) : buckets;
    return { buckets: trimmed, isMonthly: useMonthly };
  }, [dateRange, deliverables]);



  const hasTrendData = periodSummary.buckets.some((bucket) => bucket.total > 0);

  const trendLabel = periodSummary.isMonthly ? 'Monthly' : 'Weekly';

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
            </div>
          </div>
          <div className={styles.heroMeta}>
            <span className={styles.metaPill}>Created {formatDate(report.createdAt)}</span>
            {periodLabel && <span className={styles.metaPill}>Period {periodLabel}</span>}
            <span className={styles.metaPill}>
              {projectList.length} project{projectList.length === 1 ? '' : 's'} included
            </span>
          </div>
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
            <div className={`${styles.chartCard} ${styles.chartSpan}`}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>{trendLabel} Delivery Volume</h3>
                  <p>Assets and bonus counts over this reporting period.</p>
                </div>
                <span className={styles.chartValue}>{assetsTotal}</span>
              </div>
              {!hasTrendData ? (
                <div className={styles.stateSmall}>No delivery activity in this period.</div>
              ) : (
                <DeliveryTrendChart data={periodSummary.buckets} />
              )}
            </div>
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
                  <h3>Feedback Resolution</h3>
                  <p>Resolved vs open feedback threads.</p>
                </div>
                <span className={styles.chartValue}>{feedbackRate}%</span>
              </div>
              <div className={styles.progressTrack} aria-label="Feedback resolution">
                <div className={styles.progressFill} style={{ width: `${feedbackRate}%` }} />
              </div>
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>Deliverable Status Mix</h3>
                  <p>Breakdown of work by status.</p>
                </div>
                <span className={styles.chartValue}>{deliverableTotal}</span>
              </div>
              {deliverableTotal === 0 ? (
                <div className={styles.stateSmall}>No deliverables yet.</div>
              ) : (
                <StatusDistributionChart data={deliverableStatusSummary} />
              )}
            </div>

            <div className={styles.chartCard}>
              <div className={styles.chartHeader}>
                <div>
                  <h3>Assets by Project</h3>
                  <p>Distribution of assets delivered.</p>
                </div>
                <span className={styles.chartValue}>{assetsTotal}</span>
              </div>
              {assetsTotal === 0 ? (
                <div className={styles.stateSmall}>No assets recorded.</div>
              ) : (
                <AssetsByProjectChart data={assetsByProject} />
              )}
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
