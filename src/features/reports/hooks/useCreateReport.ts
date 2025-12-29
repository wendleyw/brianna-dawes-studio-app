import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@shared/lib/supabase';
import { reportRepository } from '../api/reportRepository';
import { reportService } from '../services/reportService';
import { reportPDFService } from '../services/reportPDFService';
import { ReportPDFDocument } from '../components/ReportPDFDocument';
import { reportKeys } from '../services/reportKeys';
import { createLogger } from '@shared/lib/logger';
import { useAuth } from '@features/auth';
import type { CreateReportInput, ProjectReportData } from '../domain/report.types';

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

      // Step 2: Generate metrics using existing reportService
      const metrics = await reportService.getProjectMetrics(input.projectId);

      // Step 3: Get recent activity (last 10 items for this project)
      const recentActivity = await reportService.getRecentActivity(20);
      const projectActivity = recentActivity.filter((a) => a.projectId === input.projectId);

      // Step 4: Get upcoming deadlines for this project
      // TODO: Implement in reportService if needed
      const upcomingDeadlines: any[] = [];

      // Step 5: Build ProjectReportData snapshot
      const reportData: ProjectReportData = {
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
          totalAssets: 0, // TODO: Calculate from deliverables if needed
          totalBonusAssets: 0, // TODO: Calculate from deliverables if needed
          averageApprovalTime: metrics.averageApprovalTime,
          totalFeedback: metrics.totalFeedback,
          resolvedFeedback: metrics.resolvedFeedback,
        },
        recentActivity: projectActivity.slice(0, 10),
        upcomingDeadlines,
      };

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
