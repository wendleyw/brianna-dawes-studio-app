import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardAnalytics } from '../../hooks/useAnalytics';
import { Button, RefreshIcon } from '@shared/ui';
import styles from './AdminDashboardPage.module.css';
import type {
  ClientAnalytics,
  DesignerAnalytics,
  RecentProject,
  RecentActivityItem,
  MonthlyMetrics,
} from '../../domain/analytics.types';

type TabType = 'overview' | 'clients' | 'team' | 'activity';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { data, isLoading, error, refetch, isFetching } = useDashboardAnalytics();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2 className={styles.errorTitle}>Failed to load dashboard</h2>
          <p className={styles.errorMessage}>{error.message}</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>No data available</div>
      </div>
    );
  }

  const { overview, projectsByStatus, clients, designers, monthlyMetrics, recentProjects, recentActivity } = data;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate('/admin')}
            title="Back to Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div>
            <h1 className={styles.title}>Admin Dashboard</h1>
            <p className={styles.subtitle}>Analytics and insights for your studio</p>
          </div>
        </div>
        <button
          className={`${styles.refreshButton} ${isFetching ? styles.spinning : ''}`}
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshIcon size={16} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'overview' ? styles.active : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'clients' ? styles.active : ''}`}
          onClick={() => setActiveTab('clients')}
        >
          Clients
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'team' ? styles.active : ''}`}
          onClick={() => setActiveTab('team')}
        >
          Team
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'activity' ? styles.active : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          Activity
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          overview={overview}
          projectsByStatus={projectsByStatus}
          monthlyMetrics={monthlyMetrics}
          recentProjects={recentProjects}
          onViewProject={(id) => navigate(`/projects/${id}`)}
        />
      )}

      {activeTab === 'clients' && (
        <ClientsTab clients={clients} onViewClient={(id) => navigate(`/projects?client=${id}`)} />
      )}

      {activeTab === 'team' && (
        <TeamTab designers={designers} />
      )}

      {activeTab === 'activity' && (
        <ActivityTab activities={recentActivity} onViewProject={(id) => navigate(`/projects/${id}`)} />
      )}
    </div>
  );
}

// Overview Tab Component
interface OverviewTabProps {
  overview: NonNullable<ReturnType<typeof useDashboardAnalytics>['data']>['overview'];
  projectsByStatus: NonNullable<ReturnType<typeof useDashboardAnalytics>['data']>['projectsByStatus'];
  monthlyMetrics: MonthlyMetrics[];
  recentProjects: RecentProject[];
  onViewProject: (id: string) => void;
}

function OverviewTab({ overview, projectsByStatus, monthlyMetrics, recentProjects, onViewProject }: OverviewTabProps) {
  return (
    <>
      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KPICard
          label="Total Projects"
          value={overview.totalProjects}
          subtext={`${overview.activeProjects} active`}
        />
        <KPICard
          label="Total Clients"
          value={overview.totalClients}
          subtext={`${overview.activeClients} with active projects`}
        />
        <KPICard
          label="Designers"
          value={overview.totalDesigners}
          subtext="Team members"
        />
        <KPICard
          label="Deliverables"
          value={overview.totalDeliverables}
          subtext={`${overview.approvedDeliverables} approved`}
        />
        <KPICard
          label="Total Assets"
          value={overview.totalAssets}
          subtext="Created to date"
        />
        <KPICard
          label="Completion Rate"
          value={`${overview.completionRate}%`}
          subtext={`${overview.pendingDeliverables} pending`}
        />
      </div>

      {/* Status Distribution */}
      <div className={styles.statusGrid}>
        <StatusCard status="on_track" count={projectsByStatus.on_track} />
        <StatusCard status="in_progress" count={projectsByStatus.in_progress} />
        <StatusCard status="review" count={projectsByStatus.review} />
        <StatusCard status="urgent" count={projectsByStatus.urgent} />
        <StatusCard status="critical" count={projectsByStatus.critical} />
        <StatusCard status="overdue" count={projectsByStatus.overdue} />
        <StatusCard status="done" count={projectsByStatus.done} />
      </div>

      {/* Charts and Recent */}
      <div className={styles.twoColumnGrid}>
        {/* Monthly Trends Chart */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3 className={styles.chartTitle}>Monthly Trends</h3>
            <div className={styles.chartLegend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.projects}`} />
                Projects
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.deliverables}`} />
                Deliverables
              </span>
            </div>
          </div>
          <MonthlyChart data={monthlyMetrics.slice(-6)} />
        </div>

        {/* Recent Projects */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <span>Recent Projects</span>
            <span className={styles.sectionAction} onClick={() => onViewProject('')}>
              View All
            </span>
          </div>
          <div className={styles.listContent}>
            {recentProjects.length === 0 ? (
              <div className={styles.emptyState}>No projects yet</div>
            ) : (
              recentProjects.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  className={styles.projectItem}
                  onClick={() => onViewProject(project.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={styles.projectInfo}>
                    <div className={styles.projectName}>{project.name}</div>
                    <div className={styles.projectMeta}>
                      {project.clientName} &bull; {project.deliverablesCount} deliverables
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatusClass(project.status)}`}>
                    {formatStatus(project.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Clients Tab Component
interface ClientsTabProps {
  clients: ClientAnalytics[];
  onViewClient: (id: string) => void;
}

function ClientsTab({ clients, onViewClient }: ClientsTabProps) {
  const sortedClients = [...clients].sort((a, b) => b.totalProjects - a.totalProjects);

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span>All Clients ({clients.length})</span>
      </div>
      <div className={styles.listContent}>
        {sortedClients.length === 0 ? (
          <div className={styles.emptyState}>No clients yet</div>
        ) : (
          sortedClients.map((client) => (
            <div
              key={client.id}
              className={styles.listItem}
              onClick={() => onViewClient(client.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.avatar}>
                {client.avatarUrl ? (
                  <img src={client.avatarUrl} alt={client.name} />
                ) : (
                  getInitials(client.name)
                )}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{client.name}</div>
                <div className={styles.itemMeta}>
                  {client.companyName || client.email}
                  {client.planName && ` \u2022 ${client.planName}`}
                </div>
              </div>
              <div className={styles.itemStats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{client.totalProjects}</span>
                  <span className={styles.statLabel}>Projects</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{client.activeProjects}</span>
                  <span className={styles.statLabel}>Active</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{client.totalDeliverables}</span>
                  <span className={styles.statLabel}>Deliverables</span>
                </div>
                {client.deliverablesLimit > 0 && (
                  <div className={styles.statItem}>
                    <div className={styles.progressBar}>
                      <div
                        className={`${styles.progressFill} ${getProgressClass(client.usagePercentage)}`}
                        style={{ width: `${Math.min(client.usagePercentage, 100)}%` }}
                      />
                    </div>
                    <span className={styles.statLabel}>{client.usagePercentage}% used</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Team Tab Component
interface TeamTabProps {
  designers: DesignerAnalytics[];
}

function TeamTab({ designers }: TeamTabProps) {
  const sortedDesigners = [...designers].sort((a, b) => b.totalProjects - a.totalProjects);

  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span>Team Members ({designers.length})</span>
      </div>
      <div className={styles.listContent}>
        {sortedDesigners.length === 0 ? (
          <div className={styles.emptyState}>No team members yet</div>
        ) : (
          sortedDesigners.map((designer) => (
            <div key={designer.id} className={styles.listItem}>
              <div className={styles.avatar}>
                {designer.avatarUrl ? (
                  <img src={designer.avatarUrl} alt={designer.name} />
                ) : (
                  getInitials(designer.name)
                )}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{designer.name}</div>
                <div className={styles.itemMeta}>{designer.email}</div>
              </div>
              <div className={styles.itemStats}>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{designer.totalProjects}</span>
                  <span className={styles.statLabel}>Projects</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{designer.activeProjects}</span>
                  <span className={styles.statLabel}>Active</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{designer.approvedDeliverables}</span>
                  <span className={styles.statLabel}>Approved</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{designer.pendingReviews}</span>
                  <span className={styles.statLabel}>Pending</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{designer.avgApprovalTime}d</span>
                  <span className={styles.statLabel}>Avg Time</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Activity Tab Component
interface ActivityTabProps {
  activities: RecentActivityItem[];
  onViewProject: (id: string) => void;
}

function ActivityTab({ activities, onViewProject }: ActivityTabProps) {
  return (
    <div className={styles.listCard}>
      <div className={styles.listHeader}>
        <span>Recent Activity</span>
      </div>
      <div className={styles.listContent}>
        {activities.length === 0 ? (
          <div className={styles.emptyState}>No recent activity</div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={styles.activityItem}
              onClick={() => activity.projectId && onViewProject(activity.projectId)}
              style={{ cursor: activity.projectId ? 'pointer' : 'default' }}
            >
              <div className={`${styles.activityIcon} ${getActivityIconClass(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className={styles.activityContent}>
                <div className={styles.activityText}>{activity.description}</div>
                <div className={styles.activityTime}>{formatRelativeTime(activity.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// KPI Card Component
interface KPICardProps {
  label: string;
  value: string | number;
  subtext: string;
}

function KPICard({ label, value, subtext }: KPICardProps) {
  return (
    <div className={styles.kpiCard}>
      <span className={styles.kpiLabel}>{label}</span>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiSubtext}>{subtext}</div>
    </div>
  );
}

// Status Card Component
function StatusCard({ status, count }: { status: string; count: number }) {
  const statusClassMap: Record<string, string | undefined> = {
    on_track: styles.onTrack,
    in_progress: styles.inProgress,
    review: styles.review,
    urgent: styles.urgent,
    critical: styles.critical,
    overdue: styles.overdue,
    done: styles.done,
  };

  return (
    <div className={`${styles.statusCard} ${statusClassMap[status] ?? ''}`}>
      <div className={styles.statusCount}>{count}</div>
      <div className={styles.statusLabel}>{formatStatus(status)}</div>
    </div>
  );
}

// Monthly Chart Component
function MonthlyChart({ data }: { data: MonthlyMetrics[] }) {
  const maxProjects = Math.max(...data.map((d) => d.projectsCreated), 1);
  const maxDeliverables = Math.max(...data.map((d) => d.deliverablesApproved), 1);
  const maxValue = Math.max(maxProjects, maxDeliverables);

  return (
    <div className={styles.barChart}>
      {data.map((item) => (
        <div key={item.month} className={styles.barGroup}>
          <div
            className={`${styles.bar} ${styles.deliverables}`}
            style={{ height: `${(item.deliverablesApproved / maxValue) * 160}px` }}
            title={`${item.deliverablesApproved} deliverables`}
          />
          <div
            className={`${styles.bar} ${styles.projects}`}
            style={{ height: `${(item.projectsCreated / maxValue) * 160}px` }}
            title={`${item.projectsCreated} projects`}
          />
          <span className={styles.barLabel}>{formatMonth(item.month)}</span>
        </div>
      ))}
    </div>
  );
}

// Helper Functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function getStatusClass(status: string): string {
  const classMap: Record<string, string | undefined> = {
    on_track: styles.onTrack,
    in_progress: styles.inProgress,
    review: styles.review,
    urgent: styles.urgent,
    critical: styles.critical,
    overdue: styles.overdue,
    done: styles.done,
  };
  return classMap[status] ?? '';
}

function getProgressClass(percentage: number): string {
  if (percentage < 50) return styles.low ?? '';
  if (percentage < 80) return styles.medium ?? '';
  return styles.high ?? '';
}

function getActivityIconClass(type: string): string {
  const classMap: Record<string, string | undefined> = {
    project_created: styles.project,
    project_completed: styles.project,
    deliverable_approved: styles.deliverable,
    client_joined: styles.client,
    feedback_added: styles.feedback,
  };
  return classMap[type] ?? styles.project ?? '';
}

function getActivityIcon(type: string): string {
  const iconMap: Record<string, string> = {
    project_created: '+',
    project_completed: '\u2713',
    deliverable_approved: '\u2713',
    client_joined: '\u270B',
    feedback_added: '\u2709',
  };
  return iconMap[type] || '\u25CF';
}

function formatMonth(month: string): string {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-US', { month: 'short' });
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
