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
      .select('id, status');

    // Status values: critical, overdue, urgent, on_track, in_progress, review, done
    const activeStatuses = ['in_progress', 'review', 'on_track', 'urgent', 'critical', 'overdue'];
    const projectCounts = {
      total: projects?.length || 0,
      active: projects?.filter((p) => activeStatuses.includes(p.status)).length || 0,
      completed: projects?.filter((p) => p.status === 'done').length || 0,
    };

    // Get user counts
    const { data: users } = await supabase.from('users').select('id, role');

    const userCounts = {
      clients: users?.filter((u) => u.role === 'client').length || 0,
      designers: users?.filter((u) => u.role === 'designer').length || 0,
    };

    // Get active clients (with at least one active project)
    const { data: activeClientProjects } = await supabase
      .from('projects')
      .select('client_id')
      .in('status', ['in_progress', 'review', 'on_track', 'urgent', 'critical']);

    const activeClientIds = new Set(activeClientProjects?.map((p) => p.client_id) || []);

    // Get deliverable counts
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('id, status, due_date, count');

    const now = new Date().toISOString();
    const deliverableCounts = {
      total: deliverables?.length || 0,
      approved: deliverables?.filter((d) => d.status === 'approved').length || 0,
      pending: deliverables?.filter((d) => ['pending', 'wip', 'review'].includes(d.status)).length || 0,
      overdue:
        deliverables?.filter(
          (d) =>
            d.due_date &&
            d.due_date < now &&
            !['approved', 'delivered'].includes(d.status)
        ).length || 0,
    };

    // Total assets
    const totalAssets = deliverables?.reduce((sum, d) => sum + ((d.count as number) || 0), 0) || 0;

    // Completion rate
    const completionRate =
      deliverableCounts.total > 0
        ? Math.round((deliverableCounts.approved / deliverableCounts.total) * 100)
        : 0;

    return {
      totalProjects: projectCounts.total,
      activeProjects: projectCounts.active,
      completedProjects: projectCounts.completed,
      archivedProjects: 0, // No archived status in current enum
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
   * Status enum: critical, overdue, urgent, on_track, in_progress, review, done
   */
  async getProjectsByStatus(): Promise<ProjectsByStatus> {
    const { data: projects } = await supabase.from('projects').select('status');

    const counts: ProjectsByStatus = {
      critical: 0,
      overdue: 0,
      urgent: 0,
      on_track: 0,
      in_progress: 0,
      review: 0,
      done: 0,
    };

    projects?.forEach((p) => {
      if (p.status in counts) {
        counts[p.status as keyof ProjectsByStatus]++;
      }
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
      .select('id, client_id, status, created_at');

    // Get all deliverables
    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('id, project_id, status');

    // Get subscription plans
    const { data: plans } = await supabase.from('subscription_plans').select('*');

    const plansMap = new Map(plans?.map((p) => [p.id, p]) || []);

    return clients.map((client) => {
      const clientProjects = projects?.filter((p) => p.client_id === client.id) || [];
      const projectIds = clientProjects.map((p) => p.id);
      const clientDeliverables = deliverables?.filter((d) => projectIds.includes(d.project_id)) || [];

      const plan = client.subscription_plan_id ? plansMap.get(client.subscription_plan_id) : null;
      const deliverablesLimit = (plan?.deliverables_limit as number) || 0;
      const deliverablesUsed = (client.deliverables_used as number) || 0;

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
        activeProjects: clientProjects.filter((p) =>
          ['in_progress', 'review', 'on_track', 'urgent', 'critical', 'overdue'].includes(p.status)
        ).length,
        completedProjects: clientProjects.filter((p) => p.status === 'done').length,
        totalDeliverables: clientDeliverables.length,
        approvedDeliverables: clientDeliverables.filter((d) => d.status === 'approved').length,
        planId: client.subscription_plan_id as string | null,
        planName: (plan?.display_name as string) || null,
        deliverablesUsed,
        deliverablesLimit,
        usagePercentage: deliverablesLimit > 0 ? Math.round((deliverablesUsed / deliverablesLimit) * 100) : 0,
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
    const { data: projects } = await supabase.from('projects').select('id, status');

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
        activeProjects: designerProjects.filter((p) =>
          ['in_progress', 'review', 'on_track', 'urgent', 'critical', 'overdue'].includes(p.status)
        ).length,
        completedProjects: designerProjects.filter((p) => p.status === 'done').length,
        totalDeliverables: designerDeliverables.length,
        approvedDeliverables: approvedDeliverables.length,
        avgApprovalTime,
        pendingReviews: designerDeliverables.filter((d) => d.status === 'review').length,
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

      if (d.status === 'approved') {
        const approvedDate = d.updated_at.split('T')[0];
        if (!dataMap.has(approvedDate)) {
          dataMap.set(approvedDate, {
            date: approvedDate,
            projectsCreated: 0,
            projectsCompleted: 0,
            deliverablesCreated: 0,
            deliverablesApproved: 0,
            clientsJoined: 0,
          });
        }
        dataMap.get(approvedDate)!.deliverablesApproved++;
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

      if (d.status === 'approved') {
        const approvedMonth = d.updated_at.substring(0, 7);
        if (monthlyMap.has(approvedMonth)) {
          monthlyMap.get(approvedMonth)!.deliverablesApproved++;
          // Estimate revenue based on deliverable count (you can adjust this)
          monthlyMap.get(approvedMonth)!.revenue += ((d.count as number) || 1) * 100;
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
