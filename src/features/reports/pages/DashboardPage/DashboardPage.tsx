import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Skeleton, Logo, Dialog, Button, Input } from '@shared/ui';
import { ChevronDownIcon } from '@shared/ui/Icons';
import { useAuth } from '@features/auth';
import { useProjects } from '@features/projects';
import { projectKeys } from '@features/projects/services/projectKeys';
import { zoomToProject, useMiro } from '@features/boards';
import { useMasterBoardSettings } from '@features/boards/hooks/useMasterBoard';
import { miroTimelineService } from '@features/boards/services/miroSdkService';
import { supabase } from '@shared/lib/supabase';
import { supabaseRestQuery, isInMiroIframe } from '@shared/lib/supabaseRest';
import type { Project, ProjectFilters as ProjectFiltersType, ProjectStatus } from '@features/projects/domain/project.types';
import { STATUS_COLUMNS, getStatusColumn, getStatusProgress, getTimelineStatus } from '@shared/lib/timelineStatus';
import { formatDateShort, formatDateMonthYear } from '@shared/lib/dateFormat';
import { useRealtimeSubscription } from '@shared/hooks/useRealtimeSubscription';
import type { AdminTab } from '@features/admin/domain/types';
import { useSetting, useAppSettingsMutations } from '@features/admin/hooks/useAppSettings';
import { createLogger } from '@shared/lib/logger';
import styles from './DashboardPage.module.css';

const EMPTY_PROJECTS: Project[] = [];
const logger = createLogger('DashboardPage');
const STATUS_BADGES: Record<ProjectStatus, { label: string; accent: string; soft: string }> = {
  overdue: { label: 'Overdue', accent: '#b91c1c', soft: 'rgba(185, 28, 28, 0.12)' },
  urgent: { label: 'Urgent', accent: '#c2410c', soft: 'rgba(194, 65, 12, 0.12)' },
  in_progress: { label: 'On Track', accent: '#ba7a68', soft: 'rgba(186, 122, 104, 0.12)' },
  review: { label: 'In Review', accent: '#1E3A8A', soft: 'rgba(30, 58, 138, 0.12)' },
  done: { label: 'Done', accent: '#0f766e', soft: 'rgba(15, 118, 110, 0.12)' },
};

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

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7" />
    <path d="M9 22V12h6v10" />
    <path d="M21 22H3" />
  </svg>
);

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7h5l2 3h11v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const FileTextIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const TeamIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const BellIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

function getInitials(name?: string | null): string {
  if (!name) return 'BD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'BD';
  return parts.slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('');
}


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
  const [boardCreatedAt, setBoardCreatedAt] = useState<string | null>(null);

  // Deliverables Drive URL (admin-configurable)
  const { data: driveUrl } = useSetting<string>('deliverables_drive_url');
  const { upsertSetting, isUpdating: isSavingDriveUrl } = useAppSettingsMutations();
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveUrlInput, setDriveUrlInput] = useState('');
  // Handler to open Admin Dashboard in panel view
  const openAdminDashboard = useCallback((tab: AdminTab) => {
    navigate(`/admin?tab=${encodeURIComponent(tab)}`);
  }, [navigate]);

  const navigateToProjects = useCallback((destination: string) => {
    navigate(destination, { state: { showSplash: true } });
  }, [navigate]);

  useEffect(() => {
    let isActive = true;

    if (!miro || !isInMiro) {
      setBoardCreatedAt(null);
      return undefined;
    }

    (async () => {
      try {
        const info = await miro.board.getInfo() as { createdAt?: string; created_at?: string };
        const createdAt = info.createdAt || info.created_at || null;
        if (isActive) {
          setBoardCreatedAt(createdAt);
        }
      } catch (error) {
        logger.warn('Failed to load board info', error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [miro, isInMiro, currentBoardId]);

  const analyticsSince = boardCreatedAt ? formatDateMonthYear(boardCreatedAt) : null;

  // Debug log
  logger.debug('Render', {
    hasUser: !!user,
    userId: user?.id,
    userRole: user?.role,
    isInMiro,
    currentBoardId,
    masterBoardId
  });

  // Check if we're on the Master Board
  const isMasterBoard = !!(isInMiro && currentBoardId && masterBoardId && currentBoardId === masterBoardId);

  logger.debug('Master board check', {
    isInMiro,
    currentBoardId,
    masterBoardId,
    isMatch: currentBoardId === masterBoardId,
    isMasterBoard
  });

  // Initialize Master Timeline when opening the Master Board
  useEffect(() => {
    let isActive = true;

    if (!isMasterBoard || !miro) {
      return undefined;
    }

    (async () => {
      try {
        logger.debug('Master board detected, checking timeline initialization');

        const timelineState = miroTimelineService.getState();
        logger.debug('Timeline state', timelineState);

        if (!timelineState && isActive) {
          logger.debug('Timeline not initialized, initializing now');
          await miroTimelineService.initializeTimeline();
          logger.debug('Timeline initialized successfully');
        } else {
          logger.debug('Timeline already initialized, ensuring Files/Chat column');
          // Even if timeline is initialized, try to ensure Files/Chat column exists
          // This is handled inside initializeTimeline via the singleton check
          await miroTimelineService.initializeTimeline();
        }
      } catch (error) {
        logger.error('Failed to initialize timeline', error);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [isMasterBoard, miro]);

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
    logger.debug('Filters', f);
    return f;
  }, [isInMiro, currentBoardId, isMasterBoard, selectedClientId]);

  // Fetch ALL projects (pageSize: 1000 to avoid pagination limits for dashboard stats)
  const { data: projectsData, isLoading: projectsLoading, refetch, error: projectsError } = useProjects({ filters, pageSize: 1000 });

  // Debug log for projects query
  logger.debug('Projects query', {
    isLoading: projectsLoading,
    hasData: !!projectsData,
    dataLength: projectsData?.data?.length,
    error: projectsError
  });

  // Fetch clients list for filter dropdown (only when on Master Board)
  const { data: clientsData } = useQuery<Array<{ id: string; name: string; company_name: string | null }>>({
    queryKey: ['clients-for-filter'],
    queryFn: async () => {
      // In Miro iframe context, prefer REST because supabase-js can hang.
      if (isInMiroIframe()) {
        // Try to use the authenticated session token (more secure).
        // Keep a small timeout so we don't hang inside Miro iframe.
        let authToken: string | null = null;
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 500));
          const result = await Promise.race([sessionPromise, timeoutPromise]);
          if (result && typeof result === 'object' && 'data' in result) {
            authToken =
              (result as { data: { session: { access_token: string } | null } }).data.session?.access_token ?? null;
          }
        } catch {
          authToken = null;
        }

        const result = await supabaseRestQuery<Array<{ id: string; name: string; company_name: string | null }>>('users', {
          select: 'id,name,company_name',
          eq: { role: 'client' },
          order: { column: 'name', ascending: true },
          authToken,
        });
        if (result.error) throw new Error(result.error.message);
        return result.data || [];
      }

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

      const asAssetRows = (rows: Array<{ count: number | null; bonus_count: number | null }> | null) =>
        (rows || []).map((d) => ({
          count: typeof d.count === 'number' ? d.count : 1,
          bonus_count: typeof d.bonus_count === 'number' ? d.bonus_count : 0,
        }));

      // Use REST API in Miro iframe context to avoid Supabase client hanging
      if (isInMiroIframe()) {
        logger.debug('Using REST API for deliverables (Miro iframe context)');
        // Try: count + bonus_count (newest)
        const result = await supabaseRestQuery<Array<{ count?: number; bonus_count?: number }>>(
          'deliverables',
          { select: 'count,bonus_count', in: { project_id: projectIds } }
        );
        if (!result.error) {
          return asAssetRows(
            (result.data || []).map((d) => ({
              count: typeof d.count === 'number' ? d.count : null,
              bonus_count: typeof d.bonus_count === 'number' ? d.bonus_count : null,
            }))
          );
        }

        // Fallback: count only
        const fallbackCount = await supabaseRestQuery<Array<{ count?: number }>>('deliverables', {
          select: 'count',
          in: { project_id: projectIds },
        });
        if (!fallbackCount.error) {
          return asAssetRows(
            (fallbackCount.data || []).map((d) => ({
              count: typeof d.count === 'number' ? d.count : null,
              bonus_count: 0,
            }))
          );
        }

        // Last resort: no count columns exist → treat each deliverable as 1 asset
        const fallbackIds = await supabaseRestQuery<Array<{ id: string }>>('deliverables', {
          select: 'id',
          in: { project_id: projectIds },
        });
        if (fallbackIds.error) throw new Error(fallbackIds.error.message);
        return (fallbackIds.data || []).map(() => ({ count: 1, bonus_count: 0 }));
      }

      // Standard Supabase client for non-iframe context
      const { data, error } = await supabase.from('deliverables').select('count, bonus_count').in('project_id', projectIds);
      if (!error) {
        return asAssetRows(
          ((data as Array<{ count?: number; bonus_count?: number }> | null) || []).map((d) => ({
            count: typeof d.count === 'number' ? d.count : null,
            bonus_count: typeof d.bonus_count === 'number' ? d.bonus_count : null,
          }))
        );
      }

      // Fallback: count only
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('deliverables')
        .select('count')
        .in('project_id', projectIds);
      if (!fallbackError) {
        return asAssetRows(
          (fallbackData || []).map((d) => ({
            count: typeof d.count === 'number' ? d.count : null,
            bonus_count: 0,
          }))
        );
      }

      // Last resort: no count columns exist → treat each deliverable as 1 asset
      const { data: idOnlyData, error: idOnlyError } = await supabase
        .from('deliverables')
        .select('id')
        .in('project_id', projectIds);
      if (idOnlyError) throw idOnlyError;
      return (idOnlyData || []).map(() => ({ count: 1, bonus_count: 0 }));
    },
    // Only run when we have project IDs (after projects are loaded)
    enabled: !projectsLoading,
  });

  const isLoading = projectsLoading || deliverablesLoading;
  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const canCreateProjects = isAdmin || isClient;
  const [isExpanded, setIsExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);

  // Get projects array from response
  const projectsList = useMemo(() => projectsData?.data ?? EMPTY_PROJECTS, [projectsData?.data]);
  const reviewProjects = useMemo(() => {
    return projectsList
      .filter((project) => {
        const status = getTimelineStatus(project);
        if (status !== 'review') return false;
        if (isClient) return !project.wasApproved;
        return true;
      })
      .sort((a, b) => {
        if (isAdmin && a.wasApproved !== b.wasApproved) {
          return a.wasApproved ? -1 : 1;
        }
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return aDate - bDate;
      })
      .slice(0, 3);
  }, [projectsList, isAdmin, isClient]);

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

  useEffect(() => {
    const container = containerRef.current;
    const nav = navRef.current;
    if (!container || !nav) return;

    const updateNavHeight = () => {
      const height = nav.getBoundingClientRect().height;
      container.style.setProperty('--dash-nav-height', `${height + 64}px`);
    };

    updateNavHeight();

    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateNavHeight);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [isExpanded]);

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
    <>
    <div
      ref={containerRef}
      className={`${styles.container} ${!isExpanded ? styles.navCollapsed : ''}`}
    >
      <section className={styles.hero}>
        <div className={styles.heroLogo}>
          <Logo animated={true} size="xl" />
        </div>
        <p className={styles.brandName}>BRIANNA DAWES STUDIOS</p>
        {isMasterBoard ? (
          <div className={styles.masterBoardBadge}>Master Overview</div>
        ) : (
          <h1 className={styles.welcome}>
            Welcome, <span className={styles.userName}>{user?.name?.split(' ')[0] || 'User'}</span>
          </h1>
        )}
      </section>

      {/* Client Filter - Only on Master Board (admin only) */}
      {isMasterBoard && isAdmin && clientsData && (
        <section className={`${styles.section} ${styles.sectionDelay1}`}>
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
      <section className={`${styles.section} ${styles.sectionDelay2}`}>
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
              const destination = (isMasterBoard && selectedClientId)
                ? `/projects?clientId=${selectedClientId}`
                : '/projects';
              navigateToProjects(destination);
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
              onClick={() => openAdminDashboard('analytics')}
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

      {/* Awaiting Your Review */}
      <section className={`${styles.section} ${styles.sectionDelay3}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Awaiting Your Review</h2>
          <button
            className={styles.sectionLink}
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              params.set('status', 'review');
              if (selectedClientId) params.set('clientId', selectedClientId);
              navigateToProjects(`/projects?${params.toString()}`);
            }}
          >
            See all
          </button>
        </div>
        <div className={styles.deliverablesList}>
          {reviewProjects.length === 0 ? (
            <div className={styles.emptyDeliverables}>No items awaiting your review.</div>
          ) : (
            reviewProjects.map((project) => {
              const displayStatus = getTimelineStatus(project);
              const statusMeta = STATUS_BADGES[displayStatus];
              const progress = getStatusProgress(displayStatus);
              const designers = project.designers || [];
              const visibleDesigners = designers.slice(0, 2);
              const extraDesigners = designers.length - visibleDesigners.length;
              const dueLabel = project.dueDate ? formatDateShort(project.dueDate) : 'No due date';
              return (
                <div
                  key={project.id}
                  className={styles.deliverableCard}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateToProjects(`/projects/${project.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigateToProjects(`/projects/${project.id}`);
                    }
                  }}
                >
                  <span
                    className={styles.deliverableAccent}
                    style={{ backgroundColor: statusMeta.accent }}
                  />
                  <div className={styles.deliverableHeader}>
                    <div>
                      <span className={styles.deliverableMeta}>
                        {project.client?.name || 'Project'}
                      </span>
                      <h3 className={styles.deliverableTitle}>{project.name}</h3>
                    </div>
                    <span
                      className={styles.statusBadge}
                      style={{ color: statusMeta.accent, backgroundColor: statusMeta.soft }}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className={styles.deliverableFooter}>
                    <div className={styles.deliverableLeft}>
                      <div className={styles.deliverableDate}>
                        <CalendarIcon />
                        <span>{dueLabel}</span>
                      </div>
                      <div className={styles.avatarGroup}>
                        {visibleDesigners.map((designer) => (
                          <span key={designer.id} className={styles.avatarChip}>
                            {designer.avatarUrl ? (
                              <img src={designer.avatarUrl} alt={designer.name} />
                            ) : (
                              getInitials(designer.name)
                            )}
                          </span>
                        ))}
                        {extraDesigners > 0 && (
                          <span className={styles.avatarChip}>+{extraDesigners}</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.progressWrap}>
                      <span className={styles.progressValue}>{progress}%</span>
                      <div className={styles.progressBar}>
                        <span
                          className={styles.progressFill}
                          style={{ width: `${progress}%`, backgroundColor: statusMeta.accent }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Analytics */}
      <section className={`${styles.section} ${styles.sectionDelay4}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Analytics</h2>
          {analyticsSince && (
            <span className={styles.analyticsBadge}>Since {analyticsSince}</span>
          )}
        </div>
        <div className={styles.analyticsGrid}>
          <div
            className={`${styles.analyticsCard} ${styles.analyticsCardClickable}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              const params = new URLSearchParams();
              params.set('status', 'active');
              if (selectedClientId) params.set('clientId', selectedClientId);
              navigateToProjects(`/projects?${params.toString()}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const params = new URLSearchParams();
                params.set('status', 'active');
                if (selectedClientId) params.set('clientId', selectedClientId);
                navigateToProjects(`/projects?${params.toString()}`);
              }
            }}
          >
            <span className={styles.analyticsValue}>{activeProjects}</span>
            <span className={styles.analyticsLabelLink}>Projects Active</span>
          </div>
          <div
            className={`${styles.analyticsCard} ${styles.analyticsCardClickable}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              const params = new URLSearchParams();
              params.set('status', 'done');
              if (selectedClientId) params.set('clientId', selectedClientId);
              navigateToProjects(`/projects?${params.toString()}`);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const params = new URLSearchParams();
                params.set('status', 'done');
                if (selectedClientId) params.set('clientId', selectedClientId);
                navigateToProjects(`/projects?${params.toString()}`);
              }
            }}
          >
            <span className={styles.analyticsValueSuccess}>{completedProjects}</span>
            <span className={styles.analyticsLabelLink}>Projects Done</span>
          </div>
          <div
            className={`${styles.analyticsCard} ${styles.deliveredCard} ${driveUrl || isAdmin ? styles.analyticsCardClickable : ''}`}
            role={driveUrl || isAdmin ? 'button' : undefined}
            tabIndex={driveUrl || isAdmin ? 0 : undefined}
            onClick={() => {
              if (isAdmin) {
                setDriveUrlInput((driveUrl as string) || '');
                setIsDriveModalOpen(true);
              } else if (driveUrl) {
                window.open(driveUrl as string, '_blank', 'noopener,noreferrer');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (isAdmin) {
                  setDriveUrlInput((driveUrl as string) || '');
                  setIsDriveModalOpen(true);
                } else if (driveUrl) {
                  window.open(driveUrl as string, '_blank', 'noopener,noreferrer');
                }
              }
            }}
          >
            <span className={styles.analyticsValue}>{totalDeliverables}</span>
            <span className={driveUrl || isAdmin ? styles.analyticsLabelLinkLight : styles.analyticsLabel}>
              Deliverables Delivered
            </span>
            <span className={styles.assetsSub}>
              <span>Assets: {totalAssets}</span>
              {totalBonusAssets > 0 && (
                <span className={styles.bonusText}>Bonus: +{totalBonusAssets}</span>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* Project Timeline */}
      <section className={`${styles.section} ${styles.sectionDelay5} ${styles.timelineSection}`}>
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

      <nav
        ref={navRef}
        className={`${styles.bottomNav} ${!isExpanded ? styles.bottomNavCollapsed : ''}`}
        aria-label="Primary"
      >
        <button
          type="button"
          className={styles.navToggle}
          aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span className={styles.navIcon}>
            <ChevronDownIcon isOpen={isExpanded} />
          </span>
        </button>
        <div className={styles.navItems}>
          <button
            type="button"
            className={`${styles.navButton} ${styles.navButtonActive}`}
            onClick={() => navigate('/dashboard')}
            aria-current="page"
          >
            <span className={styles.navIcon}>
              <HomeIcon />
            </span>
            <span>Home</span>
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => {
              const destination = (isMasterBoard && selectedClientId)
                ? `/projects?clientId=${selectedClientId}`
                : '/projects';
              navigateToProjects(destination);
            }}
          >
            <span className={styles.navIcon}>
              <FolderIcon />
            </span>
            <span>Projects</span>
          </button>
          {!isAdmin && (
            <button
              type="button"
              className={styles.navButton}
              onClick={() => navigate('/reports')}
            >
              <span className={styles.navIcon}>
                <FileTextIcon />
              </span>
              <span>Reports</span>
            </button>
          )}
          <button
            type="button"
            className={`${styles.navButton} ${!isAdmin ? styles.navButtonDisabled : ''}`}
            onClick={() => {
              if (isAdmin) navigate('/admin?tab=users');
            }}
            aria-disabled={!isAdmin}
            disabled={!isAdmin}
          >
            <span className={styles.navIcon}>
              <TeamIcon />
            </span>
            <span>Team</span>
          </button>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => navigate('/notifications')}
          >
            <span className={styles.navIcon}>
              <BellIcon />
            </span>
            <span>Notifications</span>
          </button>
          <button
            type="button"
            className={`${styles.navButton} ${!isAdmin ? styles.navButtonDisabled : ''}`}
            onClick={() => {
              if (isAdmin) navigate('/admin?tab=settings');
            }}
            aria-disabled={!isAdmin}
            disabled={!isAdmin}
          >
            <span className={styles.navIcon}>
              <SettingsIcon />
            </span>
            <span>Settings</span>
          </button>
        </div>
      </nav>
      <div className={styles.bottomSpacer} aria-hidden="true" />
    </div>

    {/* Drive URL modal (admin only) */}
    {isAdmin && (
      <Dialog
        open={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        title="Google Drive Link"
        description="Set the Google Drive URL for delivered assets. Clients and designers will be able to click to open it."
        size="sm"
      >
        <div className={styles.driveModalContent}>
          <Input
            value={driveUrlInput}
            onChange={(e) => setDriveUrlInput(e.target.value)}
            placeholder="https://drive.google.com/..."
          />
          <div className={styles.driveModalActions}>
            {driveUrlInput && driveUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await upsertSetting.mutateAsync({
                    key: 'deliverables_drive_url',
                    value: '',
                    description: 'Google Drive URL for delivered assets',
                  });
                  setIsDriveModalOpen(false);
                }}
                disabled={isSavingDriveUrl}
              >
                Remove link
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDriveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={async () => {
                await upsertSetting.mutateAsync({
                  key: 'deliverables_drive_url',
                  value: driveUrlInput.trim(),
                  description: 'Google Drive URL for delivered assets',
                });
                setIsDriveModalOpen(false);
              }}
              disabled={isSavingDriveUrl || !driveUrlInput.trim()}
            >
              {isSavingDriveUrl ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </Dialog>
    )}
    </>
  );
}
