import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { Skeleton, Logo } from '@shared/ui';
import { useAuth } from '@features/auth';
import { useProjects } from '@features/projects';
import { projectKeys } from '@features/projects/services/projectKeys';
import { zoomToProject, useMiro } from '@features/boards';
import { useMasterBoardSettings } from '@features/boards/hooks/useMasterBoard';
import { supabase } from '@shared/lib/supabase';
import { supabaseRestQuery, isInMiroIframe } from '@shared/lib/supabaseRest';
import type { ProjectFilters as ProjectFiltersType } from '@features/projects/domain/project.types';
import { STATUS_COLUMNS, getStatusColumn } from '@shared/lib/timelineStatus';
import { formatDateShort, formatDateMonthYear } from '@shared/lib/dateFormat';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import styles from './DashboardPage.module.css';
import type { ProjectStatus } from '@features/projects/domain/project.types';

// Icons
const PlusIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const GridIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/>
    <rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/>
  </svg>
);

const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="8" height="8" rx="1"/>
    <rect x="13" y="3" width="8" height="4" rx="1"/>
    <rect x="13" y="9" width="8" height="12" rx="1"/>
    <rect x="3" y="13" width="8" height="8" rx="1"/>
  </svg>
);

// STATUS_COLORS replaced by STATUS_COLUMNS from @shared/lib/timelineStatus

// Get color for a project based on its status (using centralized config)
function getProjectColor(project: { status: ProjectStatus }): string {
  return getStatusColumn(project.status).color;
}

// Get month key for grouping (e.g., "2024-11" for November 2024)
function getMonthKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Get month label from key (e.g., "NOV" or "NOV 2024" from "2024-11")
function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year || '2024', 10), parseInt(month || '1', 10) - 1, 1);
  return formatDateMonthYear(date);
}

// Get all months between earliest and latest project dates
function getMonthRange(projects: Array<{ dueDate: string | null }>): string[] {
  const projectsWithDates = projects.filter(p => p.dueDate);
  if (projectsWithDates.length === 0) return [];

  const dates = projectsWithDates.map(p => new Date(p.dueDate!));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  const months: string[] = [];
  const current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  while (current <= end) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
    current.setMonth(current.getMonth() + 1);
  }

  return months;
}

// Group projects by month
function groupProjectsByMonth<T extends { dueDate: string | null }>(projects: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  projects.forEach(project => {
    if (!project.dueDate) return;
    const monthKey = getMonthKey(project.dueDate);
    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, []);
    }
    grouped.get(monthKey)!.push(project);
  });

  return grouped;
}

// formatDate replaced by formatDateShort from @shared/lib/dateFormat

export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isInMiro, boardId: currentBoardId, miro } = useMiro();
  const { boardId: masterBoardId } = useMasterBoardSettings();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Handler to open Admin Dashboard in modal
  const handleOpenAdminDashboard = useCallback(async () => {
    if (miro && isInMiro) {
      try {
        await miro.board.ui.openModal({
          url: 'app.html?route=/admin/dashboard',
          width: 900,
          height: 700,
          fullscreen: false,
        });
      } catch (error) {
        console.error('Failed to open admin modal', error);
        // Fallback to navigation
        navigate('/admin/dashboard');
      }
    } else {
      navigate('/admin/dashboard');
    }
  }, [miro, isInMiro, navigate]);

  // Debug log
  console.log('[DashboardPage] Render:', {
    hasUser: !!user,
    userId: user?.id,
    userRole: user?.role,
    isInMiro,
    currentBoardId,
    masterBoardId
  });

  // Check if we're on the Master Board
  const isMasterBoard = !!(isInMiro && currentBoardId && masterBoardId && currentBoardId === masterBoardId);

  // IMPORTANT: Filter projects by current board for data isolation
  // Exception: On Master Board, load ALL projects (no board filter)
  const filters: ProjectFiltersType = useMemo(() => {
    const f: ProjectFiltersType = {};
    if (isInMiro && currentBoardId && !isMasterBoard) {
      f.miroBoardId = currentBoardId;
    }
    // Filter by selected client if on Master Board
    if (isMasterBoard && selectedClientId) {
      f.clientId = selectedClientId;
    }
    console.log('[DashboardPage] Filters:', f);
    return f;
  }, [isInMiro, currentBoardId, isMasterBoard, selectedClientId]);

  // Fetch ALL projects (pageSize: 1000 to avoid pagination limits for dashboard stats)
  const { data: projectsData, isLoading: projectsLoading, refetch, error: projectsError } = useProjects({ filters, pageSize: 1000 });

  // Debug log for projects query
  console.log('[DashboardPage] Projects query:', {
    isLoading: projectsLoading,
    hasData: !!projectsData,
    dataLength: projectsData?.data?.length,
    error: projectsError
  });

  // Fetch clients list for filter dropdown (only when on Master Board)
  const { data: clientsData } = useQuery<Array<{ id: string; name: string; company_name: string | null }>>({
    queryKey: ['clients-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, company_name')
        .eq('role', 'client')
        .order('name');
      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string; company_name: string | null }>;
    },
    enabled: isMasterBoard,
  });

  // Realtime subscription for project updates
  useRealtimeSubscription<{ id: string; status: string }>({
    table: 'projects',
    event: 'UPDATE',
    onUpdate: useCallback(() => {
      // Refetch projects when any project is updated
      refetch();
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }, [refetch, queryClient]),
    enabled: true,
  });

  // Get project IDs for filtering deliverables
  const projectIds = useMemo(() => {
    return (projectsData?.data || []).map(p => p.id);
  }, [projectsData]);

  // Query deliverables filtered by board (via project IDs)
  const { data: deliverablesData, isLoading: deliverablesLoading } = useQuery({
    queryKey: ['deliverables-stats', projectIds],
    queryFn: async () => {
      // If no projects, return empty array
      if (projectIds.length === 0) {
        return [];
      }

      // Use REST API in Miro iframe context to avoid Supabase client hanging
      if (isInMiroIframe()) {
        console.log('[DashboardPage] Using REST API for deliverables (Miro iframe context)');
        const result = await supabaseRestQuery<Array<{ count: number; bonus_count: number }>>('deliverables', {
          select: 'count,bonus_count',
          in: { project_id: projectIds },
        });
        if (result.error) {
          // Fallback without bonus_count
          const fallbackResult = await supabaseRestQuery<Array<{ count: number }>>('deliverables', {
            select: 'count',
            in: { project_id: projectIds },
          });
          if (fallbackResult.error) throw new Error(fallbackResult.error.message);
          return (fallbackResult.data || []).map(d => ({ count: d.count, bonus_count: 0 }));
        }
        return result.data || [];
      }

      // Standard Supabase client for non-iframe context
      const { data, error } = await supabase
        .from('deliverables')
        .select('count, bonus_count')
        .in('project_id', projectIds);

      // If bonus_count doesn't exist, fallback to just count
      if (error) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('deliverables')
          .select('count')
          .in('project_id', projectIds);
        if (fallbackError) throw fallbackError;
        return (fallbackData || []).map(d => ({ count: d.count, bonus_count: 0 }));
      }
      return data || [];
    },
    // Only run when we have project IDs (after projects are loaded)
    enabled: !projectsLoading,
  });

  const isLoading = projectsLoading || deliverablesLoading;
  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const canCreateProjects = isAdmin || isClient;

  // Get projects array from response
  const projectsList = projectsData?.data || [];

  // Calculate stats (memoized to prevent recalculation on every render)
  const { activeProjects, completedProjects } = useMemo(() => ({
    activeProjects: projectsList.filter(p => p.status !== 'done').length,
    completedProjects: projectsList.filter(p => p.status === 'done').length,
  }), [projectsList]);

  // Calculate deliverable stats from direct query (memoized)
  const { totalDeliverables, totalAssets, totalBonusAssets } = useMemo(() => ({
    totalDeliverables: deliverablesData?.length || 0,
    totalAssets: deliverablesData?.reduce((sum, d) => sum + ((d.count as number) || 0), 0) || 0,
    totalBonusAssets: deliverablesData?.reduce((sum, d) => sum + ((d.bonus_count as number) || 0), 0) || 0,
  }), [deliverablesData]);

  // Get projects for timeline (ALL statuses, organized by date) - memoized
  const timelineProjects = useMemo(() =>
    projectsList
      .filter(p => p.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()),
    [projectsList]
  );

  // Get all months in range and group projects by month (memoized)
  const { monthRange, projectsByMonth } = useMemo(() => ({
    monthRange: getMonthRange(timelineProjects),
    projectsByMonth: groupProjectsByMonth(timelineProjects),
  }), [timelineProjects]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Skeleton height={100} />
          <Skeleton height={80} />
          <Skeleton height={120} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header with Logo */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <Logo size="lg" animated />
        </div>
        <p className={styles.brandName}>BRIANNA DAWES STUDIOS</p>
        {isMasterBoard ? (
          <h1 className={styles.welcome}>
            <span className={styles.masterBoardBadge}>📊 Master Overview</span>
          </h1>
        ) : (
          <h1 className={styles.welcome}>
            Welcome, <span className={styles.userName}>{user?.name?.split(' ')[0] || 'User'}</span>
          </h1>
        )}
      </header>

      {/* Client Filter - Only on Master Board */}
      {isMasterBoard && clientsData && (
        <section className={styles.section}>
          <div className={styles.clientFilterRow}>
            <label className={styles.filterLabel}>Filter by Client:</label>
            <select
              className={styles.clientSelect}
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value || null)}
            >
              <option value="">All Clients ({clientsData.length})</option>
              {clientsData.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name || client.name}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          {canCreateProjects && (
            <button
              className={styles.actionCard}
              onClick={() => navigate('/projects/new')}
            >
              <div className={styles.actionIconPrimary}>
                <PlusIcon />
              </div>
              <span className={styles.actionLabel}>New</span>
              <span className={styles.actionSub}>Project</span>
            </button>
          )}

          <button
            className={styles.actionCard}
            onClick={() => {
              // Pass selected client ID to projects page if on Master Board
              if (isMasterBoard && selectedClientId) {
                navigate(`/projects?clientId=${selectedClientId}`);
              } else {
                navigate('/projects');
              }
            }}
          >
            <div className={styles.actionIconSecondary}>
              <GridIcon />
            </div>
            <span className={styles.actionLabel}>Projects</span>
            <span className={styles.actionSub}>View all</span>
          </button>

          {isAdmin && (
            <button
              className={styles.actionCard}
              onClick={handleOpenAdminDashboard}
            >
              <div className={styles.actionIconBlue}>
                <DashboardIcon />
              </div>
              <span className={styles.actionLabel}>Admin</span>
              <span className={styles.actionSub}>Dashboard</span>
            </button>
          )}
        </div>
      </section>

      {/* Analytics */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Analytics</h2>
        <div className={styles.analyticsGrid}>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsValue}>{activeProjects}</span>
            <span className={styles.analyticsLabel}>Active</span>
          </div>
          <div className={styles.analyticsCard}>
            <span className={styles.analyticsValueSuccess}>{completedProjects}</span>
            <span className={styles.analyticsLabel}>Done</span>
          </div>
          <div className={`${styles.analyticsCard} ${styles.deliveredCard}`}>
            <span className={styles.analyticsValue}>{totalDeliverables}</span>
            <span className={styles.analyticsLabel}>Delivered</span>
            <span className={styles.assetsSub}>
              {totalAssets} assets
              {totalBonusAssets > 0 && (
                <span className={styles.bonusText}> +{totalBonusAssets}</span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Project Timeline */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Project Timeline</h2>
        <div className={styles.timelineCard}>
          {/* Legend - all 5 status in one row */}
          <div className={styles.legend}>
            <div className={styles.legendRow}>
              {STATUS_COLUMNS.map((col) => (
                <span key={col.id} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ backgroundColor: col.color }}/>
                  {col.label}
                </span>
              ))}
            </div>
          </div>

          {/* Month columns */}
          <div className={styles.monthColumns}>
            {monthRange.length === 0 ? (
              <p className={styles.emptyTimeline}>No projects with deadlines</p>
            ) : (
              monthRange.map((monthKey) => {
                const monthProjects = projectsByMonth.get(monthKey) || [];
                return (
                  <div key={monthKey} className={styles.monthColumn}>
                    <div className={styles.monthHeader}>{getMonthLabel(monthKey)}</div>
                    <div className={styles.monthProjects}>
                      {monthProjects.map((project) => (
                        <button
                          key={project.id}
                          className={styles.timelineItem}
                          style={{ backgroundColor: getProjectColor(project) }}
                          onClick={() => zoomToProject(project.id)}
                          onDoubleClick={() => navigate(`/projects?selected=${project.id}`)}
                          title="Click to zoom • Double-click to open"
                        >
                          <span className={styles.timelineName}>{project.name}</span>
                          <span className={styles.timelineSeparator}>|</span>
                          <span className={styles.timelineDate}>{formatDateShort(project.dueDate!)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
