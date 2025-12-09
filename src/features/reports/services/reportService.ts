import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type {
  DashboardMetrics,
  ProjectMetrics,
  TimelineMetrics,
  ReportFilters,
  ActivityItem,
  DeadlineItem,
} from '../domain/report.types';

const logger = createLogger('ReportService');

/**
 * ReportService - Handles analytics and reporting operations
 *
 * This service provides functionality for:
 * - Dashboard metrics (project counts, completion rates, deadlines)
 * - Project-specific metrics (deliverable stats, approval times)
 * - Designer performance metrics
 * - Timeline/historical metrics with date filtering
 * - Activity feed aggregation
 *
 * Uses Supabase RPC functions for complex aggregations.
 *
 * @example
 * ```typescript
 * // Get dashboard overview
 * const metrics = await reportService.getDashboardMetrics();
 *
 * // Get project-specific stats
 * const projectStats = await reportService.getProjectMetrics(projectId);
 * ```
 */
class ReportService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    // Get basic metrics using RPC function
    const { data: metrics, error: metricsError } = await supabase.rpc('get_dashboard_metrics');

    if (metricsError) throw metricsError;

    // Get projects by status
    const { data: projectsByStatus } = await supabase
      .from('projects')
      .select('status')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((p) => {
          counts[p.status] = (counts[p.status] || 0) + 1;
        });
        return {
          data: Object.entries(counts).map(([status, count]) => ({ status, count })),
        };
      });

    // Get deliverables by type
    const { data: deliverablesByType } = await supabase
      .from('deliverables')
      .select('type')
      .then(({ data }) => {
        const counts: Record<string, number> = {};
        data?.forEach((d) => {
          counts[d.type] = (counts[d.type] || 0) + 1;
        });
        return {
          data: Object.entries(counts).map(([type, count]) => ({ type, count })),
        };
      });

    // Get upcoming deadlines
    const { data: deadlines } = await supabase
      .from('deliverables')
      .select(`
        id,
        name,
        status,
        due_date,
        project:projects(id, name, priority)
      `)
      .gte('due_date', new Date().toISOString())
      .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
      .not('status', 'in', '("delivered","approved")')
      .order('due_date', { ascending: true })
      .limit(10);

    const upcomingDeadlines: DeadlineItem[] = (deadlines || [])
      .map((d) => {
        try {
          // d.project can be an array or single object depending on Supabase version
          const projectData = d.project;
          const project = Array.isArray(projectData)
            ? (projectData[0] as { id: string; name: string; priority: string } | undefined)
            : (projectData as { id: string; name: string; priority: string } | null);

          const dueDate = d.due_date ? new Date(d.due_date) : new Date();
          const daysRemaining = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          return {
            id: d.id,
            name: d.name,
            projectId: project?.id || '',
            projectName: project?.name || '',
            dueDate: d.due_date,
            daysRemaining: Number.isFinite(daysRemaining) ? daysRemaining : 0,
            status: d.status,
            priority: project?.priority || 'medium',
          };
        } catch (error) {
          logger.error('Failed to map deadline item', { deliverableId: d.id, error });
          return null;
        }
      })
      .filter((item): item is DeadlineItem => item !== null);

    // Calculate completion rate
    const { count: totalDeliverables } = await supabase
      .from('deliverables')
      .select('*', { count: 'exact', head: true });

    const { count: completedDeliverables } = await supabase
      .from('deliverables')
      .select('*', { count: 'exact', head: true })
      .in('status', ['approved', 'delivered']);

    const completionRate = totalDeliverables
      ? Math.round(((completedDeliverables || 0) / totalDeliverables) * 100)
      : 0;

    // Get asset totals (sum of count and bonus_count)
    // Note: bonus_count column may not exist until migration 017 is applied
    let totalAssets = 0;
    let totalBonusAssets = 0;

    // First try with bonus_count
    const { data: assetData, error: assetError } = await supabase
      .from('deliverables')
      .select('count, bonus_count');

    if (!assetError && assetData) {
      assetData.forEach((d) => {
        totalAssets += (d.count as number) || 0;
        totalBonusAssets += (d.bonus_count as number) || 0;
      });
    } else {
      // Fallback: bonus_count column doesn't exist yet
      const { data: fallbackData } = await supabase
        .from('deliverables')
        .select('count');

      fallbackData?.forEach((d) => {
        totalAssets += (d.count as number) || 0;
      });
    }

    return {
      activeProjects: metrics?.active_projects || 0,
      pendingReviews: metrics?.pending_reviews || 0,
      overdueDeliverables: metrics?.overdue_deliverables || 0,
      completionRate,
      totalAssets,
      totalBonusAssets,
      projectsByStatus: projectsByStatus || [],
      deliverablesByType: deliverablesByType || [],
      recentActivity: metrics?.recent_activity || [],
      upcomingDeadlines,
    };
  }

  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const { data: project } = await supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    const { data: stats } = await supabase.rpc('get_project_stats', {
      p_project_id: projectId,
    });

    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('created_at, status, updated_at')
      .eq('project_id', projectId);

    // Calculate average approval time
    let totalApprovalTime = 0;
    let approvedCount = 0;

    deliverables?.forEach((d) => {
      if (d.status === 'approved' || d.status === 'delivered') {
        const created = new Date(d.created_at).getTime();
        const updated = new Date(d.updated_at).getTime();
        totalApprovalTime += (updated - created) / (1000 * 60 * 60 * 24);
        approvedCount++;
      }
    });

    const averageApprovalTime = approvedCount > 0 ? totalApprovalTime / approvedCount : 0;

    const total = stats?.total_deliverables || 0;
    const completed = (stats?.approved_deliverables || 0) + (stats?.delivered_deliverables || 0);

    return {
      projectId,
      projectName: project?.name || '',
      totalDeliverables: total,
      completedDeliverables: completed,
      pendingDeliverables: stats?.pending_deliverables || 0,
      overdueDeliverables: 0, // Would need additional query
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      averageApprovalTime: Math.round(averageApprovalTime * 10) / 10,
      totalFeedback: stats?.total_feedback || 0,
      resolvedFeedback: (stats?.total_feedback || 0) - (stats?.pending_feedback || 0),
    };
  }

  async getTimelineMetrics(filters: ReportFilters): Promise<TimelineMetrics[]> {
    const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = filters.endDate || new Date().toISOString();

    const { data: deliverables } = await supabase
      .from('deliverables')
      .select('created_at, status, updated_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const { data: feedback } = await supabase
      .from('deliverable_feedback')
      .select('created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    // Group by date
    const metricsMap: Record<string, TimelineMetrics> = {};

    deliverables?.forEach((d) => {
      const date = d.created_at.split('T')[0];
      if (!metricsMap[date]) {
        metricsMap[date] = {
          date,
          deliverablesCreated: 0,
          deliverablesApproved: 0,
          deliverablesRejected: 0,
          feedbackCount: 0,
        };
      }
      metricsMap[date].deliverablesCreated++;

      if (d.status === 'approved') {
        const approvedDate = d.updated_at.split('T')[0];
        if (!metricsMap[approvedDate]) {
          metricsMap[approvedDate] = {
            date: approvedDate,
            deliverablesCreated: 0,
            deliverablesApproved: 0,
            deliverablesRejected: 0,
            feedbackCount: 0,
          };
        }
        metricsMap[approvedDate].deliverablesApproved++;
      }

      if (d.status === 'rejected') {
        const rejectedDate = d.updated_at.split('T')[0];
        if (!metricsMap[rejectedDate]) {
          metricsMap[rejectedDate] = {
            date: rejectedDate,
            deliverablesCreated: 0,
            deliverablesApproved: 0,
            deliverablesRejected: 0,
            feedbackCount: 0,
          };
        }
        metricsMap[rejectedDate].deliverablesRejected++;
      }
    });

    feedback?.forEach((f) => {
      const date = f.created_at.split('T')[0];
      if (!metricsMap[date]) {
        metricsMap[date] = {
          date,
          deliverablesCreated: 0,
          deliverablesApproved: 0,
          deliverablesRejected: 0,
          feedbackCount: 0,
        };
      }
      metricsMap[date].feedbackCount++;
    });

    return Object.values(metricsMap).sort((a, b) => a.date.localeCompare(b.date));
  }

  async getRecentActivity(limit = 20): Promise<ActivityItem[]> {
    const { data } = await supabase
      .from('activity_feed')
      .select('*')
      .order('activity_time', { ascending: false })
      .limit(limit);

    return (data || []).map((item) => ({
      id: item.item_id,
      type: item.activity_type as ActivityItem['type'],
      itemName: item.item_name,
      projectName: item.project_name,
      projectId: item.project_id,
      userName: item.user_name,
      userId: item.user_id,
      timestamp: item.activity_time,
    }));
  }
}

export const reportService = new ReportService();
