import { supabase } from '@shared/lib/supabase';
import type {
  AdminDashboardData,
  OverviewMetrics,
  ProjectsByStatus,
  ClientAnalytics,
  DesignerAnalytics,
  TimelineDataPoint,
  MonthlyMetrics,
  RecentProject,
  RecentActivityItem,
  AnalyticsFilters,
} from '../domain/analytics.types';

type TimelineProjectStatus = 'overdue' | 'urgent' | 'in_progress' | 'review' | 'done' | 'archived';

function parseDueDateForComparison(dueDate: string): number | null {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    due.setHours(23, 59, 59, 999);
  }
  return due.getTime();
}

function deriveTimelineStatus(project: {
  status: string;
  due_date: string | null;
  due_date_approved: boolean | null;
  archived_at: string | null;
}): TimelineProjectStatus {
  if (project.archived_at) return 'archived';
  const status = project.status as TimelineProjectStatus;
  if (status === 'done') return 'done';

  if (project.due_date && project.due_date_approved !== false) {
    const dueTime = parseDueDateForComparison(project.due_date);
    if (dueTime !== null && dueTime < Date.now()) return 'overdue';
  }

  // Fallback: keep stored status (or in_progress if unknown)
  if (
    status === 'overdue' ||
    status === 'urgent' ||
    status === 'in_progress' ||
    status === 'review'
  ) {
    return status;
  }
  return 'in_progress';
}

/**
 * AnalyticsService - Comprehensive analytics for Admin Dashboard
 *
 * Provides:
 * - Overview metrics (projects, clients, designers, deliverables)
 * - Client analytics with plan usage
 * - Designer performance metrics
 * - Timeline data for charts
 * - Monthly trend data
 */
class AnalyticsService {
  /**
   * Get complete dashboard data
   */
  async getDashboardData(filters?: AnalyticsFilters): Promise<AdminDashboardData> {
    const [
      overview,
      projectsByStatus,
      clients,
      designers,
      timeline,
      monthlyMetrics,
      recentProjects,
      recentActivity,
    ] = await Promise.all([
      this.getOverviewMetrics(),
      this.getProjectsByStatus(),
      this.getClientAnalytics(),
      this.getDesignerAnalytics(),
      this.getTimelineData(filters?.dateRange),
      this.getMonthlyMetrics(),
      this.getRecentProjects(),
      this.getRecentActivity(),
    ]);

    return {
      overview,
      projectsByStatus,
      clients,
      designers,
      timeline,
      monthlyMetrics,
      recentProjects,
      recentActivity,
    };
  }

  /**
   * Get overview metrics
   */
  async getOverviewMetrics(): Promise<OverviewMetrics> {
    // Get project counts
    const { data: projects } = await supabase
      .from('projects')
      .select('id, status, client_id, due_date, due_date_approved, archived_at, was_approved, was_reviewed, due_date_requested_at');

    const allProjects = projects || [];
    const archivedProjects = allProjects.filter((p) => p.archived_at).length;
    const completedProjects = allProjects.filter((p) => p.status === 'done' && !p.archived_at).length;
    const overdueProjects = allProjects.filter((p) => deriveTimelineStatus(p) === 'overdue').length;
    const activeProjects = allProjects.filter((p) => {
      const derived = deriveTimelineStatus(p);
      return derived !== 'done' && derived !== 'archived';
    }).length;

    const clientApprovedProjects = allProjects.filter(
      (p) => !p.archived_at && p.status === 'review' && p.was_approved === true
    ).length;
    const changesRequestedProjects = allProjects.filter(
      (p) => !p.archived_at && p.status !== 'done' && p.was_reviewed === true && p.was_approved !== true
    ).length;
    const dueDateRequests = allProjects.filter(
      (p) => !p.archived_at && p.status !== 'done' && !!p.due_date_requested_at && p.due_date_approved === false
    ).length;

    const projectCounts = {
      total: allProjects.length,
      active: activeProjects,
      completed: completedProjects,
    };

    // Get user counts
    const { data: users } = await supabase.from('users').select('id, role');

    const userCounts = {
      clients: users?.filter((u) => u.role === 'client').length || 0,
      designers: users?.filter((u) => u.role === 'designer').length || 0,
    };

    // Active clients (with at least one active project in the current 5-status workflow)
    const activeClientIds = new Set(
      allProjects
        .filter((p) => {
          const derived = deriveTimelineStatus(p);
          return derived !== 'done' && derived !== 'archived';
        })
        .map((p) => p.client_id)
        .filter(Boolean)
    );

    // Get deliverable counts
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('id, status, due_date, count, bonus_count');

    const now = Date.now();
    const deliverableCounts = {
      total: deliverables?.length || 0,
      approved: deliverables?.filter((d) => d.status === 'approved').length || 0,
      pending:
        deliverables?.filter((d) => !['approved', 'delivered'].includes(d.status)).length || 0,
      overdue:
        deliverables?.filter(
          (d) =>
            d.due_date &&
            (() => {
              const dueTime = parseDueDateForComparison(d.due_date);
              return dueTime !== null && dueTime < now;
            })() &&
            !['approved', 'delivered'].includes(d.status)
        ).length || 0,
    };

    // Total assets
    const totalAssets = deliverables?.reduce((sum, d) => {
      const count = (d.count as number) || 0;
      const bonus = typeof (d as { bonus_count?: unknown }).bonus_count === 'number' ? ((d as { bonus_count: number }).bonus_count) : 0;
      return sum + count + bonus;
    }, 0) || 0;

    // Completion rate
    const completedDeliverables =
      deliverables?.filter((d) => ['approved', 'delivered'].includes(d.status)).length || 0;
    const completionRate =
      deliverableCounts.total > 0
        ? Math.round((completedDeliverables / deliverableCounts.total) * 100)
        : 0;

    return {
      totalProjects: projectCounts.total,
      activeProjects: projectCounts.active,
      completedProjects: projectCounts.completed,
      archivedProjects,
      overdueProjects,
      clientApprovedProjects,
      changesRequestedProjects,
      dueDateRequests,
      totalClients: userCounts.clients,
      activeClients: activeClientIds.size,
      totalDesigners: userCounts.designers,
      totalDeliverables: deliverableCounts.total,
      approvedDeliverables: deliverableCounts.approved,
      pendingDeliverables: deliverableCounts.pending,
      overdueDeliverables: deliverableCounts.overdue,
      totalAssets,
      completionRate,
    };
  }

  /**
   * Get projects grouped by status
   * Status enum: overdue, urgent, in_progress, review, done (+ archived derived from archived_at)
   */
  async getProjectsByStatus(): Promise<ProjectsByStatus> {
    const { data: projects } = await supabase
      .from('projects')
      .select('status, due_date, due_date_approved, archived_at');

    const counts: ProjectsByStatus = {
      overdue: 0,
      urgent: 0,
      in_progress: 0,
      review: 0,
      done: 0,
      archived: 0,
    };

    projects?.forEach((p) => {
      const derived = deriveTimelineStatus(p);
      if (derived in counts) counts[derived as keyof ProjectsByStatus]++;
    });

    return counts;
  }

  /**
   * Get analytics for all clients
   */
  async getClientAnalytics(): Promise<ClientAnalytics[]> {
    // Get all clients
    const { data: clients } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (!clients || clients.length === 0) return [];

    // Get all projects with client info
    const { data: projects } = await supabase
      .from('projects')
      .select('id, client_id, status, created_at, due_date, due_date_approved, archived_at');

    // Get all deliverables
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('id, project_id, status');

    return clients.map((client) => {
      const clientProjects = projects?.filter((p) => p.client_id === client.id) || [];
      const projectIds = clientProjects.map((p) => p.id);
      const clientDeliverables = deliverables?.filter((d) => projectIds.includes(d.project_id)) || [];

      const lastProject = clientProjects.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        id: client.id,
        name: client.name as string,
        email: client.email as string,
        companyName: client.company_name as string | null,
        avatarUrl: client.avatar_url as string | null,
        totalProjects: clientProjects.length,
        activeProjects: clientProjects.filter((p) => {
          const derived = deriveTimelineStatus(p);
          return derived !== 'done' && derived !== 'archived';
        }).length,
        completedProjects: clientProjects.filter((p) => p.status === 'done' && !p.archived_at).length,
        totalDeliverables: clientDeliverables.length,
        approvedDeliverables: clientDeliverables.filter((d) => d.status === 'approved').length,
        planId: null,
        planName: null,
        deliverablesUsed: 0,
        deliverablesLimit: 0,
        usagePercentage: 0,
        joinedAt: client.created_at as string,
        lastProjectAt: lastProject?.created_at || null,
      };
    });
  }

  /**
   * Get analytics for all designers
   */
  async getDesignerAnalytics(): Promise<DesignerAnalytics[]> {
    // Get all designers
    const { data: designers } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'designer')
      .order('created_at', { ascending: false });

    if (!designers || designers.length === 0) return [];

    // Get project assignments
    const { data: assignments } = await supabase.from('project_designers').select('*');

    // Get all projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id, status, due_date, due_date_approved, archived_at');

    // Get all deliverables
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('id, project_id, status, created_at, updated_at');

    return designers.map((designer) => {
      const designerAssignments = assignments?.filter((a) => a.user_id === designer.id) || [];
      const projectIds = designerAssignments.map((a) => a.project_id);
      const designerProjects = projects?.filter((p) => projectIds.includes(p.id)) || [];
      const designerDeliverables = deliverables?.filter((d) => projectIds.includes(d.project_id)) || [];

      // Calculate average approval time
      const approvedDeliverables = designerDeliverables.filter((d) => d.status === 'approved');
      let avgApprovalTime = 0;
      if (approvedDeliverables.length > 0) {
        const totalTime = approvedDeliverables.reduce((sum, d) => {
          const created = new Date(d.created_at).getTime();
          const updated = new Date(d.updated_at).getTime();
          return sum + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0);
        avgApprovalTime = Math.round((totalTime / approvedDeliverables.length) * 10) / 10;
      }

      return {
        id: designer.id,
        name: designer.name as string,
        email: designer.email as string,
        avatarUrl: designer.avatar_url as string | null,
        totalProjects: designerProjects.length,
        activeProjects: designerProjects.filter((p) => {
          const derived = deriveTimelineStatus(p);
          return derived !== 'done' && derived !== 'archived';
        }).length,
        completedProjects: designerProjects.filter((p) => p.status === 'done' && !p.archived_at).length,
        totalDeliverables: designerDeliverables.length,
        approvedDeliverables: approvedDeliverables.length,
        avgApprovalTime,
        pendingReviews: designerDeliverables.filter((d) => d.status === 'in_review').length,
        joinedAt: designer.created_at as string,
      };
    });
  }

  /**
   * Get timeline data for charts
   */
  async getTimelineData(dateRange?: { start: string; end: string }): Promise<TimelineDataPoint[]> {
    const endDate = dateRange?.end || new Date().toISOString();
    const startDate = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get projects in range
    const { data: projects } = await supabase
      .from('projects')
      .select('created_at, status, updated_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Get deliverables in range
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('created_at, status, updated_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Get clients joined in range
    const { data: clients } = await supabase
      .from('users')
      .select('created_at')
      .eq('role', 'client')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Group by date
    const dataMap = new Map<string, TimelineDataPoint>();

    projects?.forEach((p) => {
      const date = p.created_at.split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          projectsCreated: 0,
          projectsCompleted: 0,
          deliverablesCreated: 0,
          deliverablesApproved: 0,
          clientsJoined: 0,
        });
      }
      const point = dataMap.get(date)!;
      point.projectsCreated++;

      if (p.status === 'done') {
        const completedDate = p.updated_at.split('T')[0];
        if (!dataMap.has(completedDate)) {
          dataMap.set(completedDate, {
            date: completedDate,
            projectsCreated: 0,
            projectsCompleted: 0,
            deliverablesCreated: 0,
            deliverablesApproved: 0,
            clientsJoined: 0,
          });
        }
        dataMap.get(completedDate)!.projectsCompleted++;
      }
    });

    deliverables?.forEach((d) => {
      const date = d.created_at.split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          projectsCreated: 0,
          projectsCompleted: 0,
          deliverablesCreated: 0,
          deliverablesApproved: 0,
          clientsJoined: 0,
        });
      }
      dataMap.get(date)!.deliverablesCreated++;

      if (d.status === 'approved' || d.status === 'delivered') {
        const completedDate = d.updated_at.split('T')[0];
        if (!dataMap.has(completedDate)) {
          dataMap.set(completedDate, {
            date: completedDate,
            projectsCreated: 0,
            projectsCompleted: 0,
            deliverablesCreated: 0,
            deliverablesApproved: 0,
            clientsJoined: 0,
          });
        }
        dataMap.get(completedDate)!.deliverablesApproved++;
      }
    });

    clients?.forEach((c) => {
      const date = c.created_at.split('T')[0];
      if (!dataMap.has(date)) {
        dataMap.set(date, {
          date,
          projectsCreated: 0,
          projectsCompleted: 0,
          deliverablesCreated: 0,
          deliverablesApproved: 0,
          clientsJoined: 0,
        });
      }
      dataMap.get(date)!.clientsJoined++;
    });

    return Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get monthly metrics for trend analysis
   */
  async getMonthlyMetrics(): Promise<MonthlyMetrics[]> {
    // Get last 12 months of data
    const endDate = new Date();
    const startDate = new Date(endDate.getFullYear() - 1, endDate.getMonth(), 1);

    const { data: projects } = await supabase
      .from('projects')
      .select('created_at, status, updated_at')
      .gte('created_at', startDate.toISOString());

    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('created_at, status, updated_at, count')
      .gte('created_at', startDate.toISOString());

    const { data: clients } = await supabase
      .from('users')
      .select('created_at')
      .eq('role', 'client')
      .gte('created_at', startDate.toISOString());

    // Group by month
    const monthlyMap = new Map<string, MonthlyMetrics>();

    // Initialize last 12 months
    for (let i = 0; i < 12; i++) {
      const date = new Date(endDate.getFullYear(), endDate.getMonth() - i, 1);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(month, {
        month,
        projectsCreated: 0,
        projectsCompleted: 0,
        deliverablesCreated: 0,
        deliverablesApproved: 0,
        newClients: 0,
        revenue: 0,
      });
    }

    projects?.forEach((p) => {
      const month = p.created_at.substring(0, 7);
      if (monthlyMap.has(month)) {
        monthlyMap.get(month)!.projectsCreated++;
      }

      if (p.status === 'done') {
        const completedMonth = p.updated_at.substring(0, 7);
        if (monthlyMap.has(completedMonth)) {
          monthlyMap.get(completedMonth)!.projectsCompleted++;
        }
      }
    });

    deliverables?.forEach((d) => {
      const month = d.created_at.substring(0, 7);
      if (monthlyMap.has(month)) {
        monthlyMap.get(month)!.deliverablesCreated++;
      }

      if (d.status === 'approved' || d.status === 'delivered') {
        const completedMonth = d.updated_at.substring(0, 7);
        if (monthlyMap.has(completedMonth)) {
          monthlyMap.get(completedMonth)!.deliverablesApproved++;
          // Estimate revenue based on deliverable count (you can adjust this)
          monthlyMap.get(completedMonth)!.revenue += ((d.count as number) || 1) * 100;
        }
      }
    });

    clients?.forEach((c) => {
      const month = c.created_at.substring(0, 7);
      if (monthlyMap.has(month)) {
        monthlyMap.get(month)!.newClients++;
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get recent projects
   */
  async getRecentProjects(limit = 10): Promise<RecentProject[]> {
    const { data: projects } = await supabase
      .from('projects')
      .select(
        `
        id,
        name,
        status,
        created_at,
        due_date,
        client:users!projects_client_id_fkey(id, name),
        project_designers(user:users(name))
      `
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!projects) return [];

    // Get deliverable counts
    const projectIds = projects.map((p) => p.id);
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('project_id, status')
      .in('project_id', projectIds);

    return projects.map((p) => {
      const projectDeliverables = deliverables?.filter((d) => d.project_id === p.id) || [];
      const totalDeliverables = projectDeliverables.length;
      const approvedDeliverables = projectDeliverables.filter((d) => d.status === 'approved').length;

      // Handle client data - can be array or object depending on Supabase
      const clientData = p.client;
      const client = Array.isArray(clientData)
        ? (clientData[0] as { id: string; name: string } | undefined)
        : (clientData as { id: string; name: string } | null);

      // Handle designers array - safely extract names
      const designersData = p.project_designers;
      const designerNames: string[] = [];
      if (Array.isArray(designersData)) {
        for (const pd of designersData) {
          const userData = (pd as { user: unknown }).user;
          if (userData && typeof userData === 'object' && 'name' in userData) {
            const name = (userData as { name: unknown }).name;
            if (typeof name === 'string') {
              designerNames.push(name);
            }
          }
        }
      }

      return {
        id: p.id,
        name: p.name,
        status: p.status,
        clientName: client?.name || 'Unknown',
        clientId: client?.id || '',
        designerNames,
        createdAt: p.created_at,
        dueDate: p.due_date,
        deliverablesCount: totalDeliverables,
        completionPercentage:
          totalDeliverables > 0 ? Math.round((approvedDeliverables / totalDeliverables) * 100) : 0,
      };
    });
  }

  /**
   * Get recent activity
   */
  async getRecentActivity(limit = 20): Promise<RecentActivityItem[]> {
    const activities: RecentActivityItem[] = [];

    // Get recent projects
    const { data: recentProjects } = await supabase
      .from('projects')
      .select('id, name, status, created_at, updated_at, client:users!projects_client_id_fkey(id, name)')
      .order('created_at', { ascending: false })
      .limit(10);

    recentProjects?.forEach((p) => {
      const clientData = p.client;
      const client = Array.isArray(clientData)
        ? (clientData[0] as { id: string; name: string } | undefined)
        : (clientData as { id: string; name: string } | null);

      activities.push({
        id: `project-${p.id}`,
        type: 'project_created',
        description: `New project "${p.name}" created`,
        projectId: p.id,
        projectName: p.name,
        userId: client?.id || null,
        userName: client?.name || null,
        timestamp: p.created_at,
      });

      if (p.status === 'done') {
        activities.push({
          id: `project-done-${p.id}`,
          type: 'project_completed',
          description: `Project "${p.name}" completed`,
          projectId: p.id,
          projectName: p.name,
          userId: null,
          userName: null,
          timestamp: p.updated_at,
        });
      }
    });

    // Get recent approved deliverables
    const { data: approvedDeliverables } = await supabase
      .from('deliverables')
      .select('id, name, updated_at, project:projects(id, name)')
      .eq('status', 'approved')
      .order('updated_at', { ascending: false })
      .limit(10);

    approvedDeliverables?.forEach((d) => {
      const projectData = d.project;
      const project = Array.isArray(projectData)
        ? (projectData[0] as { id: string; name: string } | undefined)
        : (projectData as { id: string; name: string } | null);

      activities.push({
        id: `deliverable-${d.id}`,
        type: 'deliverable_approved',
        description: `Deliverable "${d.name}" approved`,
        projectId: project?.id || null,
        projectName: project?.name || null,
        userId: null,
        userName: null,
        timestamp: d.updated_at,
      });
    });

    // Get recent clients
    const { data: recentClients } = await supabase
      .from('users')
      .select('id, name, created_at')
      .eq('role', 'client')
      .order('created_at', { ascending: false })
      .limit(5);

    recentClients?.forEach((c) => {
      activities.push({
        id: `client-${c.id}`,
        type: 'client_joined',
        description: `New client "${c.name}" joined`,
        projectId: null,
        projectName: null,
        userId: c.id,
        userName: c.name as string,
        timestamp: c.created_at,
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const analyticsService = new AnalyticsService();

// Query keys for React Query
export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  overview: () => [...analyticsKeys.all, 'overview'] as const,
  clients: () => [...analyticsKeys.all, 'clients'] as const,
  designers: () => [...analyticsKeys.all, 'designers'] as const,
  timeline: (filters?: AnalyticsFilters) => [...analyticsKeys.all, 'timeline', filters] as const,
  monthly: () => [...analyticsKeys.all, 'monthly'] as const,
};
