import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@shared/lib/supabase';
import { reportRepository } from '../api/reportRepository';
import { reportService } from '../services/reportService';
import { reportPDFService } from '../services/reportPDFService';
import { ReportPDFDocument } from '../components/ReportPDFDocument';
import { reportKeys } from '../services/reportKeys';
import { createLogger } from '@shared/lib/logger';
import { useAuth } from '@features/auth';
import type { CreateReportInput, ProjectMetrics, ProjectReportData } from '../domain/report.types';

const logger = createLogger('useCreateReport');

/**
 * Hook to create and send a project report
 *
 * Orchestrates the complete flow:
 * 1. Fetch project data from Supabase
 * 2. Generate metrics using reportService
 * 3. Build ProjectReportData snapshot
 * 4. Generate PDF using React-PDF
 * 5. Upload PDF to Supabase Storage
 * 6. Save report record to database
 * 7. Send notification to client
 * 8. Update report status to 'sent'
 */
export function useCreateReport() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      logger.debug('Creating project report', input);

      // Ensure we have an authenticated user (required for created_by)
      if (!currentUser?.id) {
        throw new Error('You must be signed in to create a report');
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        logger.error('Failed to fetch current user', userError);
        throw new Error('Failed to authenticate report creator');
      }

      if (!user) {
        throw new Error('You must be signed in to create a report');
      }

      // Step 1: Fetch project data with all relations
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          client:users!client_id(id, name, company_name),
          designers:project_designers(user:users(id, name))
        `)
        .eq('id', input.projectId)
        .single();

      if (projectError) {
        logger.error('Failed to fetch project', projectError);
        throw new Error('Failed to fetch project data');
      }

      if (!project) {
        throw new Error('Project not found');
      }

      const reportScope = input.scope ?? 'project';
      const isClientReport = reportScope === 'client' && (input.projectIds?.length || 0) > 0;
      const scopedProjectIds = isClientReport ? (input.projectIds as string[]) : [input.projectId];

      // Step 2: Generate metrics using existing reportService
      const dateRange =
        input.startDate && input.endDate
          ? { startDate: input.startDate, endDate: input.endDate }
          : null;

      let metrics: ProjectMetrics;
      let totalAssets = 0;
      let totalBonusAssets = 0;

      if (isClientReport) {
        if (dateRange) {
          const rangeResult = await getClientMetricsForRange(
            scopedProjectIds,
            dateRange.startDate,
            dateRange.endDate
          );
          metrics = rangeResult.metrics;
          totalAssets = rangeResult.totalAssets;
          totalBonusAssets = rangeResult.totalBonusAssets;
        } else {
          const allTimeResult = await getClientMetricsForRange(scopedProjectIds);
          metrics = allTimeResult.metrics;
          totalAssets = allTimeResult.totalAssets;
          totalBonusAssets = allTimeResult.totalBonusAssets;
        }
      } else {
        if (dateRange) {
          const rangeResult = await getProjectMetricsForRange(
            input.projectId,
            project.name,
            dateRange.startDate,
            dateRange.endDate
          );
          metrics = rangeResult.metrics;
          totalAssets = rangeResult.totalAssets;
          totalBonusAssets = rangeResult.totalBonusAssets;
        } else {
          metrics = await reportService.getProjectMetrics(input.projectId);
          const assetTotals = await getProjectAssetTotals(input.projectId);
          totalAssets = assetTotals.totalAssets;
          totalBonusAssets = assetTotals.totalBonusAssets;
        }
      }

      // Step 3: Get recent activity (last 10 items for this project)
      const recentActivity = await reportService.getRecentActivity(50);
      const projectActivity = recentActivity
        .filter((a) => scopedProjectIds.includes(a.projectId))
        .filter((a) => {
          if (!dateRange) return true;
          const ts = new Date(a.timestamp).getTime();
          const start = new Date(`${dateRange.startDate}T00:00:00`).getTime();
          const end = new Date(`${dateRange.endDate}T23:59:59.999`).getTime();
          return ts >= start && ts <= end;
        });

      // Step 4: Get upcoming deadlines for this project
      // TODO: Implement in reportService if needed
      const upcomingDeadlines: any[] = [];

      // Step 5: Build ProjectReportData snapshot
      let reportData: ProjectReportData = {
        ...(dateRange ? { dateRange } : {}),
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          priority: project.priority,
          startDate: project.start_date,
          dueDate: project.due_date,
          client: {
            id: project.client.id,
            name: project.client.name,
            companyName: project.client.company_name,
          },
          designers: project.designers.map((d: any) => ({
            id: d.user.id,
            name: d.user.name,
          })),
        },
        metrics: {
          totalDeliverables: metrics.totalDeliverables,
          completedDeliverables: metrics.completedDeliverables,
          pendingDeliverables: metrics.pendingDeliverables,
          completionRate: metrics.completionRate,
          totalAssets,
          totalBonusAssets,
          averageApprovalTime: metrics.averageApprovalTime,
          totalFeedback: metrics.totalFeedback,
          resolvedFeedback: metrics.resolvedFeedback,
        },
        recentActivity: projectActivity.slice(0, 10),
        upcomingDeadlines,
      };

      if (isClientReport) {
        const projectsForReport = await fetchProjectsForClientReport(scopedProjectIds);
        const clientInfo = projectsForReport[0]?.client || {
          id: project.client.id,
          name: project.client.name,
          companyName: project.client.company_name,
        };
        reportData = {
          ...reportData,
          scope: 'client',
          client: clientInfo,
          projects: projectsForReport.map((item) => ({
            id: item.id,
            name: item.name,
            status: item.status,
            priority: item.priority,
            startDate: item.startDate,
            dueDate: item.dueDate,
          })),
        };
      }

      // Conditionally add adminNotes if provided
      if (input.adminNotes) {
        reportData.adminNotes = input.adminNotes;
      }

      // Step 6: Generate PDF blob
      const pdfBlob = await reportPDFService.generatePDFBlob(
        ReportPDFDocument,
        reportData
      );

      logger.debug('PDF generated', { size: pdfBlob.size });

      // Step 7: Upload PDF to storage
      const { url: pdfUrl } = await reportPDFService.uploadPDF(
        input.projectId,
        input.title,
        pdfBlob
      );

      logger.debug('PDF uploaded', { pdfUrl });

      // Step 8: Save report to database
      const report = await reportRepository.create({
        ...input,
        reportData,
        pdfUrl,
        pdfFilename: `${input.title}.pdf`,
        fileSizeBytes: pdfBlob.size,
        createdBy: currentUser.id,
      });

      logger.debug('Report saved to database', { reportId: report.id });

      // Step 9: Send notification to client
      const { error: notificationError } = await supabase.rpc('create_notification', {
        p_user_id: project.client.id,
        p_type: 'report_sent',
        p_title: 'New Project Report Available',
        p_message: `A new report "${input.title}" for ${project.name} has been generated and is ready for review.`,
        p_data: {
          projectId: input.projectId,
          projectName: project.name,
          reportId: report.id,
          reportTitle: input.title,
          reportType: input.reportType,
          actorId: currentUser.id,
          actorName: currentUser.name || currentUser.email || 'Admin',
        },
      });

      if (notificationError) {
        logger.warn('Failed to send notification', notificationError);
        // Don't throw - notification failure shouldn't fail report creation
      }

      // Step 11: Update report status to 'sent'
      await reportRepository.updateStatus(report.id, 'sent');

      logger.info('Report created and sent successfully', {
        reportId: report.id,
        projectId: input.projectId,
        clientId: project.client.id,
      });

      return report;
    },
    onSuccess: () => {
      // Invalidate queries to refresh lists
      queryClient.invalidateQueries({ queryKey: reportKeys.projectReports.all });
      queryClient.invalidateQueries({ queryKey: reportKeys.projectReports.lists() });
    },
    onError: (error) => {
      logger.error('Failed to create report', error);
    },
  });
}

async function getProjectMetricsForRange(
  projectId: string,
  projectName: string,
  startDate: string,
  endDate: string
) {
  const startIso = new Date(`${startDate}T00:00:00`).toISOString();
  const endIso = new Date(`${endDate}T23:59:59.999`).toISOString();

  const deliverables = await fetchDeliverables(projectId, startIso, endIso);
  const { totalAssets, totalBonusAssets } = getAssetTotals(deliverables);

  const completedStatuses = new Set(['approved', 'delivered']);
  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter((d) => completedStatuses.has(d.status)).length;
  const pendingDeliverables = totalDeliverables - completedDeliverables;

  let totalApprovalTime = 0;
  let approvedCount = 0;

  deliverables.forEach((d) => {
    if (!completedStatuses.has(d.status)) return;
    const created = new Date(d.created_at).getTime();
    const updated = new Date(d.updated_at).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(updated)) return;
    totalApprovalTime += (updated - created) / (1000 * 60 * 60 * 24);
    approvedCount++;
  });

  const averageApprovalTime = approvedCount > 0 ? totalApprovalTime / approvedCount : 0;

  const { data: feedback, error: feedbackError } = await supabase
    .from('deliverable_feedback')
    .select('status, created_at, deliverable:deliverables(project_id)')
    .eq('deliverable.project_id', projectId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (feedbackError) {
    throw new Error('Failed to fetch feedback for report period');
  }

  const totalFeedback = feedback?.length || 0;
  const resolvedFeedback = feedback?.filter((f) => f.status === 'resolved').length || 0;

  return {
    metrics: {
      projectId,
      projectName,
      totalDeliverables,
      completedDeliverables,
      pendingDeliverables,
      overdueDeliverables: 0,
      completionRate: totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0,
      averageApprovalTime: Math.round(averageApprovalTime * 10) / 10,
      totalFeedback,
      resolvedFeedback,
    },
    totalAssets,
    totalBonusAssets,
  };
}

async function getProjectAssetTotals(projectId: string) {
  const deliverables = await fetchDeliverables(projectId);
  return getAssetTotals(deliverables);
}

async function getClientMetricsForRange(projectIds: string[], startDate?: string, endDate?: string) {
  const startIso = startDate ? new Date(`${startDate}T00:00:00`).toISOString() : undefined;
  const endIso = endDate ? new Date(`${endDate}T23:59:59.999`).toISOString() : undefined;

  const deliverables = await fetchDeliverablesForProjects(projectIds, startIso, endIso);
  const { totalAssets, totalBonusAssets } = getAssetTotals(deliverables);

  const completedStatuses = new Set(['approved', 'delivered']);
  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter((d) => completedStatuses.has(d.status)).length;
  const pendingDeliverables = totalDeliverables - completedDeliverables;

  let totalApprovalTime = 0;
  let approvedCount = 0;

  deliverables.forEach((d) => {
    if (!completedStatuses.has(d.status)) return;
    const created = new Date(d.created_at).getTime();
    const updated = new Date(d.updated_at).getTime();
    if (!Number.isFinite(created) || !Number.isFinite(updated)) return;
    totalApprovalTime += (updated - created) / (1000 * 60 * 60 * 24);
    approvedCount++;
  });

  const averageApprovalTime = approvedCount > 0 ? totalApprovalTime / approvedCount : 0;
  const deliverableIds = deliverables.map((d) => d.id).filter(Boolean) as string[];

  let totalFeedback = 0;
  let resolvedFeedback = 0;

  if (deliverableIds.length > 0) {
    let feedbackQuery = supabase
      .from('deliverable_feedback')
      .select('status, created_at, deliverable_id')
      .in('deliverable_id', deliverableIds);

    if (startIso) feedbackQuery = feedbackQuery.gte('created_at', startIso);
    if (endIso) feedbackQuery = feedbackQuery.lte('created_at', endIso);

    const { data: feedback, error: feedbackError } = await feedbackQuery;
    if (feedbackError) {
      throw new Error('Failed to fetch feedback for report period');
    }

    totalFeedback = feedback?.length || 0;
    resolvedFeedback = feedback?.filter((f) => f.status === 'resolved').length || 0;
  }

  return {
    metrics: {
      projectId: projectIds[0] || '',
      projectName: 'Client Summary',
      totalDeliverables,
      completedDeliverables,
      pendingDeliverables,
      overdueDeliverables: 0,
      completionRate: totalDeliverables > 0 ? Math.round((completedDeliverables / totalDeliverables) * 100) : 0,
      averageApprovalTime: Math.round(averageApprovalTime * 10) / 10,
      totalFeedback,
      resolvedFeedback,
    },
    totalAssets,
    totalBonusAssets,
  };
}

function getAssetTotals(deliverables: Array<{ count?: number | null; bonus_count?: number | null }>) {
  return deliverables.reduce(
    (totals, item) => ({
      totalAssets: totals.totalAssets + (item.count || 0),
      totalBonusAssets: totals.totalBonusAssets + (item.bonus_count || 0),
    }),
    { totalAssets: 0, totalBonusAssets: 0 }
  );
}

async function fetchDeliverables(projectId: string, startIso?: string, endIso?: string) {
  let query = supabase
    .from('deliverables')
    .select('id, created_at, updated_at, status, count, bonus_count')
    .eq('project_id', projectId);

  if (startIso) query = query.gte('created_at', startIso);
  if (endIso) query = query.lte('created_at', endIso);

  let { data, error } = await query;

  if (error && (error as { code?: string }).code === 'PGRST204') {
    let fallbackQuery = supabase
      .from('deliverables')
      .select('id, created_at, updated_at, status, count')
      .eq('project_id', projectId);

    if (startIso) fallbackQuery = fallbackQuery.gte('created_at', startIso);
    if (endIso) fallbackQuery = fallbackQuery.lte('created_at', endIso);

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error('Failed to fetch deliverables for report period');
  }

  return (data || []) as Array<{
    id: string;
    created_at: string;
    updated_at: string;
    status: string;
    count?: number | null;
    bonus_count?: number | null;
  }>;
}

async function fetchDeliverablesForProjects(projectIds: string[], startIso?: string, endIso?: string) {
  let query = supabase
    .from('deliverables')
    .select('id, created_at, updated_at, status, count, bonus_count, project_id')
    .in('project_id', projectIds);

  if (startIso) query = query.gte('created_at', startIso);
  if (endIso) query = query.lte('created_at', endIso);

  let { data, error } = await query;

  if (error && (error as { code?: string }).code === 'PGRST204') {
    let fallbackQuery = supabase
      .from('deliverables')
      .select('id, created_at, updated_at, status, count, project_id')
      .in('project_id', projectIds);

    if (startIso) fallbackQuery = fallbackQuery.gte('created_at', startIso);
    if (endIso) fallbackQuery = fallbackQuery.lte('created_at', endIso);

    const fallback = await fallbackQuery;
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new Error('Failed to fetch deliverables for report period');
  }

  return (data || []) as Array<{
    id: string;
    created_at: string;
    updated_at: string;
    status: string;
    count?: number | null;
    bonus_count?: number | null;
    project_id: string;
  }>;
}

async function fetchProjectsForClientReport(projectIds: string[]) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status, priority, start_date, due_date, client:users!client_id(id, name, company_name)')
    .in('id', projectIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch client projects');
  }

  return (data || []).map((project: any) => ({
    id: project.id,
    name: project.name,
    status: project.status,
    priority: project.priority,
    startDate: project.start_date,
    dueDate: project.due_date,
    client: project.client,
  }));
}
