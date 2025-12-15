import {
  useOverviewMetrics,
  useProjectsByStatus,
  useClientAnalytics,
  useDesignerAnalytics,
  useMonthlyMetrics,
} from '../../hooks';
import styles from './AnalyticsTab.module.css';

export default function AnalyticsTab() {
  const { data: metrics, isLoading: metricsLoading } = useOverviewMetrics();
  const { data: projectsByStatus, isLoading: statusLoading } = useProjectsByStatus();
  const { data: clients, isLoading: clientsLoading } = useClientAnalytics();
  const { data: designers, isLoading: designersLoading } = useDesignerAnalytics();
  const { data: monthlyMetrics, isLoading: monthlyLoading } = useMonthlyMetrics();

  const isLoading =
    metricsLoading || statusLoading || clientsLoading || designersLoading || monthlyLoading;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '48px', color: '#6B7280' }}>
          Loading analytics...
        </div>
      </div>
    );
  }

  // Check if there's any data at all
  const hasAnyData = (metrics?.totalProjects || 0) > 0 ||
                     (clients?.length || 0) > 0 ||
                     (designers?.length || 0) > 0;

  if (!hasAnyData) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📊</span>
          <p>No data available yet</p>
          <p className={styles.emptySubtext}>
            Create your first project to see analytics and insights here
          </p>
        </div>
      </div>
    );
  }

  // Calculate trends from monthly metrics
  const lastTwoMonths = monthlyMetrics?.slice(-2) || [];
  const projectsTrend =
    lastTwoMonths.length === 2 && lastTwoMonths[0] && lastTwoMonths[1]
      ? lastTwoMonths[1].projectsCompleted - lastTwoMonths[0].projectsCompleted
      : 0;

  // Top performers
  const topDesigners = [...(designers || [])]
    .sort((a, b) => b.approvedDeliverables - a.approvedDeliverables)
    .slice(0, 3);

  const activeClients = [...(clients || [])]
    .filter((c) => c.activeProjects > 0)
    .sort((a, b) => b.activeProjects - a.activeProjects)
    .slice(0, 5);

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Key Performance Indicators</h3>

        {/* KPI Grid */}
        <div className={styles.kpiGrid}>
          {/* Projects KPIs */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>📁</span>
              <span className={styles.kpiLabel}>Total Projects</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.totalProjects || 0}</div>
            <div className={styles.kpiMeta}>
              <span className={styles.kpiSubValue}>
                {metrics?.activeProjects || 0} active
              </span>
              <span className={styles.kpiSubValue}>
                {metrics?.completedProjects || 0} completed
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>🔥</span>
              <span className={styles.kpiLabel}>Active Projects</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.activeProjects || 0}</div>
            <div className={styles.kpiMeta}>
              {metrics?.overdueProjects ? (
                <span className={styles.kpiAlert}>{metrics.overdueProjects} overdue</span>
              ) : (
                <span className={styles.kpiSuccess}>All on track</span>
              )}
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>✅</span>
              <span className={styles.kpiLabel}>Completion Rate</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.completionRate || 0}%</div>
            <div className={styles.kpiMeta}>
              <span className={styles.kpiSubValue}>
                {metrics?.approvedDeliverables || 0}/{metrics?.totalDeliverables || 0} deliverables
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>📈</span>
              <span className={styles.kpiLabel}>Monthly Completed</span>
            </div>
            <div className={styles.kpiValue}>
              {lastTwoMonths[1]?.projectsCompleted || 0}
            </div>
            <div className={styles.kpiMeta}>
              {projectsTrend > 0 ? (
                <span className={styles.kpiTrendUp}>+{projectsTrend} from last month</span>
              ) : projectsTrend < 0 ? (
                <span className={styles.kpiTrendDown}>{projectsTrend} from last month</span>
              ) : (
                <span className={styles.kpiSubValue}>No change</span>
              )}
            </div>
          </div>

          {/* Client KPIs */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>👥</span>
              <span className={styles.kpiLabel}>Total Clients</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.totalClients || 0}</div>
            <div className={styles.kpiMeta}>
              <span className={styles.kpiSubValue}>
                {metrics?.activeClients || 0} with active projects
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>🎨</span>
              <span className={styles.kpiLabel}>Designers</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.totalDesigners || 0}</div>
            <div className={styles.kpiMeta}>
              <span className={styles.kpiSubValue}>
                {designers?.filter((d) => d.activeProjects > 0).length || 0} active
              </span>
            </div>
          </div>

          {/* Deliverables KPIs */}
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>📦</span>
              <span className={styles.kpiLabel}>Total Deliverables</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.totalDeliverables || 0}</div>
            <div className={styles.kpiMeta}>
              <span className={styles.kpiSubValue}>
                {metrics?.totalAssets || 0} total assets
              </span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <span className={styles.kpiIcon}>⏱️</span>
              <span className={styles.kpiLabel}>Pending Items</span>
            </div>
            <div className={styles.kpiValue}>{metrics?.pendingDeliverables || 0}</div>
            <div className={styles.kpiMeta}>
              {metrics?.overdueDeliverables ? (
                <span className={styles.kpiAlert}>{metrics.overdueDeliverables} overdue</span>
              ) : (
                <span className={styles.kpiSuccess}>None overdue</span>
              )}
            </div>
          </div>
        </div>

        {/* Projects by Status */}
        <div className={styles.chartSection}>
          <h4 className={styles.chartTitle}>Projects by Status</h4>
          <div className={styles.statusGrid}>
            {projectsByStatus?.overdue ? (
              <div className={styles.statusCard} style={{ borderColor: '#EF4444' }}>
                <div className={styles.statusLabel}>🔴 Overdue</div>
                <div className={styles.statusValue}>{projectsByStatus.overdue}</div>
              </div>
            ) : null}
            {projectsByStatus?.urgent ? (
              <div className={styles.statusCard} style={{ borderColor: '#F59E0B' }}>
                <div className={styles.statusLabel}>⚠️ Urgent</div>
                <div className={styles.statusValue}>{projectsByStatus.urgent}</div>
              </div>
            ) : null}
            <div className={styles.statusCard} style={{ borderColor: '#2563EB' }}>
              <div className={styles.statusLabel}>🔵 In Progress</div>
              <div className={styles.statusValue}>{projectsByStatus?.in_progress || 0}</div>
            </div>
            <div className={styles.statusCard} style={{ borderColor: '#8B5CF6' }}>
              <div className={styles.statusLabel}>👁️ Review</div>
              <div className={styles.statusValue}>{projectsByStatus?.review || 0}</div>
            </div>
            <div className={styles.statusCard} style={{ borderColor: '#10B981' }}>
              <div className={styles.statusLabel}>✅ Done</div>
              <div className={styles.statusValue}>{projectsByStatus?.done || 0}</div>
            </div>
            <div className={styles.statusCard} style={{ borderColor: '#6B7280' }}>
              <div className={styles.statusLabel}>📦 Archived</div>
              <div className={styles.statusValue}>{projectsByStatus?.archived || 0}</div>
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className={styles.performersSection}>
          <div className={styles.performerColumn}>
            <h4 className={styles.chartTitle}>Top Designers</h4>
            <div className={styles.performerList}>
              {topDesigners.map((designer) => (
                <div key={designer.id} className={styles.performerCard}>
                  <div className={styles.performerInfo}>
                    <div className={styles.performerName}>{designer.name}</div>
                    <div className={styles.performerMeta}>
                      {designer.approvedDeliverables} approved deliverables
                    </div>
                  </div>
                  <div className={styles.performerBadge}>
                    {designer.activeProjects} active
                  </div>
                </div>
              ))}
              {topDesigners.length === 0 && (
                <div className={styles.emptyState}>No designers yet</div>
              )}
            </div>
          </div>

          <div className={styles.performerColumn}>
            <h4 className={styles.chartTitle}>Active Clients</h4>
            <div className={styles.performerList}>
              {activeClients.map((client) => (
                <div key={client.id} className={styles.performerCard}>
                  <div className={styles.performerInfo}>
                    <div className={styles.performerName}>{client.name}</div>
                    <div className={styles.performerMeta}>
                      {client.totalProjects} total projects
                    </div>
                  </div>
                  <div className={styles.performerBadge}>
                    {client.activeProjects} active
                  </div>
                </div>
              ))}
              {activeClients.length === 0 && (
                <div className={styles.emptyState}>No active clients</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
