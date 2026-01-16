import { useQuery } from '@tanstack/react-query';
import { analyticsService, analyticsKeys } from '@features/admin/services/analyticsService';
import { Logo, Skeleton } from '@shared/ui';
import type {
  OverviewMetrics,
  ClientAnalytics,
  RecentProject,
} from '@features/admin/domain/analytics.types';
import styles from './PublicKpiDashboardPage.module.css';

// Status colors matching the app's design system
const STATUS_COLORS: Record<string, string> = {
  overdue: '#b91c1c',
  urgent: '#c2410c',
  in_progress: '#ba7a68',
  review: '#1E3A8A',
  done: '#0f766e',
  archived: '#6b7280',
};

// Icons
const ProjectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Helper functions
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}

function getMonthKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year || '2024', 10), parseInt(month || '1', 10) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }).toUpperCase();
}

// Client KPI Card Component
interface ClientCardProps {
  client: ClientAnalytics;
  projects: RecentProject[];
}

function ClientCard({ client, projects }: ClientCardProps) {
  const clientProjects = projects.filter((p) => p.clientId === client.id);
  const completionRate =
    client.totalDeliverables > 0
      ? Math.round((client.approvedDeliverables / client.totalDeliverables) * 100)
      : 0;

  return (
    <div className={styles.clientCard}>
      <div className={styles.clientHeader}>
        <div className={styles.clientAvatar}>
          {client.avatarUrl ? (
            <img src={client.avatarUrl} alt={client.name} />
          ) : (
            <span>{getInitials(client.companyName || client.name)}</span>
          )}
        </div>
        <div className={styles.clientInfo}>
          <h3 className={styles.clientName}>{client.companyName || client.name}</h3>
          <p className={styles.clientEmail}>{client.name}</p>
        </div>
      </div>

      <div className={styles.clientStats}>
        <div className={styles.clientStat}>
          <span className={styles.statValue}>{client.activeProjects}</span>
          <span className={styles.statLabel}>Active</span>
        </div>
        <div className={styles.clientStat}>
          <span className={styles.statValueSuccess}>{client.completedProjects}</span>
          <span className={styles.statLabel}>Completed</span>
        </div>
        <div className={styles.clientStat}>
          <span className={styles.statValue}>{client.totalDeliverables}</span>
          <span className={styles.statLabel}>Deliverables</span>
        </div>
        <div className={styles.clientStat}>
          <span className={styles.statValueAccent}>{completionRate}%</span>
          <span className={styles.statLabel}>Rate</span>
        </div>
      </div>

      {clientProjects.length > 0 && (
        <div className={styles.clientProjects}>
          {clientProjects.slice(0, 3).map((project) => (
            <div
              key={project.id}
              className={styles.miniProject}
              style={{ borderLeftColor: STATUS_COLORS[project.status] || '#6b7280' }}
            >
              <span className={styles.miniProjectName}>{project.name}</span>
              {project.dueDate && (
                <span className={styles.miniProjectDate}>{formatDate(project.dueDate)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Timeline Component
interface TimelineProps {
  projects: RecentProject[];
  clients: ClientAnalytics[];
}

function ProjectTimeline({ projects, clients }: TimelineProps) {
  // Get projects with due dates, sorted by date
  const projectsWithDates = projects
    .filter((p) => p.dueDate && p.status !== 'done' && p.status !== 'archived')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  if (projectsWithDates.length === 0) {
    return (
      <div className={styles.timelineEmpty}>
        <p>No projects with pending due dates</p>
      </div>
    );
  }

  // Group by month
  const monthGroups = new Map<string, RecentProject[]>();
  projectsWithDates.forEach((project) => {
    const monthKey = getMonthKey(project.dueDate!);
    if (!monthGroups.has(monthKey)) {
      monthGroups.set(monthKey, []);
    }
    monthGroups.get(monthKey)!.push(project);
  });

  // Get client color map
  const clientColors = new Map<string, string>();
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
  clients.forEach((client, index) => {
    clientColors.set(client.id, colors[index % colors.length] || '#6b7280');
  });

  return (
    <div className={styles.timeline}>
      <div className={styles.timelineHeader}>
        <h3 className={styles.sectionTitle}>Project Timeline</h3>
        <div className={styles.timelineLegend}>
          {clients.slice(0, 5).map((client) => (
            <span key={client.id} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: clientColors.get(client.id) }}
              />
              {client.companyName || client.name}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.timelineContent}>
        {Array.from(monthGroups.entries()).map(([monthKey, monthProjects]) => (
          <div key={monthKey} className={styles.monthGroup}>
            <div className={styles.monthLabel}>{getMonthLabel(monthKey)}</div>
            <div className={styles.monthProjects}>
              {monthProjects.map((project) => (
                <div
                  key={project.id}
                  className={styles.timelineProject}
                  style={{
                    backgroundColor: clientColors.get(project.clientId) || '#6b7280',
                    borderLeftColor: STATUS_COLORS[project.status] || '#6b7280',
                  }}
                >
                  <div className={styles.projectContent}>
                    <span className={styles.projectName}>{project.name}</span>
                    <span className={styles.projectClient}>{project.clientName}</span>
                  </div>
                  <div className={styles.projectMeta}>
                    <span className={styles.projectDate}>{formatDate(project.dueDate!)}</span>
                    <div className={styles.projectProgress}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${project.completionPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Overview Stats Component
interface OverviewStatsProps {
  overview: OverviewMetrics;
}

function OverviewStats({ overview }: OverviewStatsProps) {
  return (
    <div className={styles.overviewStats}>
      <div className={styles.overviewStat}>
        <ProjectsIcon />
        <div className={styles.overviewStatContent}>
          <span className={styles.overviewValue}>{overview.totalProjects}</span>
          <span className={styles.overviewLabel}>Projects</span>
        </div>
      </div>
      <div className={styles.overviewStat}>
        <ClockIcon />
        <div className={styles.overviewStatContent}>
          <span className={styles.overviewValue}>{overview.activeProjects}</span>
          <span className={styles.overviewLabel}>Active</span>
        </div>
      </div>
      <div className={styles.overviewStat}>
        <CheckIcon />
        <div className={styles.overviewStatContent}>
          <span className={styles.overviewValueSuccess}>{overview.completedProjects}</span>
          <span className={styles.overviewLabel}>Completed</span>
        </div>
      </div>
      <div className={styles.overviewStat}>
        <UserIcon />
        <div className={styles.overviewStatContent}>
          <span className={styles.overviewValue}>{overview.totalClients}</span>
          <span className={styles.overviewLabel}>Clients</span>
        </div>
      </div>
    </div>
  );
}

// Main Component
export function PublicKpiDashboardPage() {
  const { data: overview, isLoading: overviewLoading } = useQuery<OverviewMetrics>({
    queryKey: analyticsKeys.overview(),
    queryFn: () => analyticsService.getOverviewMetrics(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<ClientAnalytics[]>({
    queryKey: analyticsKeys.clients(),
    queryFn: () => analyticsService.getClientAnalytics(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<RecentProject[]>({
    queryKey: [...analyticsKeys.all, 'allProjects'],
    queryFn: () => analyticsService.getRecentProjects(100), // Get more projects for timeline
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const isLoading = overviewLoading || clientsLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <Logo size="lg" />
          <h1 className={styles.title}>Studio KPIs</h1>
        </div>
        <div className={styles.loading}>
          <Skeleton height={80} />
          <div className={styles.loadingGrid}>
            <Skeleton height={200} />
            <Skeleton height={200} />
            <Skeleton height={200} />
          </div>
          <Skeleton height={300} />
        </div>
      </div>
    );
  }

  const activeClients = clients?.filter((c) => c.activeProjects > 0) || [];
  const inactiveClients = clients?.filter((c) => c.activeProjects === 0) || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Logo size="lg" />
        <h1 className={styles.title}>Brianna Dawes Studios</h1>
        <p className={styles.subtitle}>Project Dashboard</p>
      </div>

      {overview && <OverviewStats overview={overview} />}

      {/* Active Clients Section */}
      {activeClients.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Active Clients <span className={styles.countBadge}>{activeClients.length}</span>
          </h2>
          <div className={styles.clientsGrid}>
            {activeClients.map((client) => (
              <ClientCard key={client.id} client={client} projects={projects || []} />
            ))}
          </div>
        </section>
      )}

      {/* Timeline Section */}
      {clients && projects && <ProjectTimeline projects={projects} clients={clients} />}

      {/* Inactive Clients Section */}
      {inactiveClients.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Clients Without Active Projects{' '}
            <span className={styles.countBadgeMuted}>{inactiveClients.length}</span>
          </h2>
          <div className={styles.inactiveClientsList}>
            {inactiveClients.map((client) => (
              <div key={client.id} className={styles.inactiveClient}>
                <span className={styles.inactiveClientName}>
                  {client.companyName || client.name}
                </span>
                <span className={styles.inactiveClientStats}>
                  {client.completedProjects} project{client.completedProjects !== 1 ? 's' : ''}{' '}
                  completed
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className={styles.footer}>
        <p>Last updated: {new Date().toLocaleTimeString('en-US')}</p>
        <p className={styles.footerNote}>Auto-refreshes every minute</p>
      </div>
    </div>
  );
}
