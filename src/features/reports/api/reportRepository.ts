import { supabase } from '@shared/lib/supabase';
import type {
  ProjectReport,
  ProjectReportFilters,
  CreateReportInput,
  ProjectReportData,
} from '../domain/report.types';

/**
 * Repository for managing project reports (PDF reports sent to clients)
 * Handles CRUD operations with Supabase database
 */
export class ReportRepository {
  /**
   * List project reports with optional filters
   */
  async list(filters: ProjectReportFilters = {}): Promise<ProjectReport[]> {
    let query = supabase
      .from('project_reports')
      .select(`
        *,
        project:projects(
          id,
          name,
          client:users!client_id(id, name)
        ),
        creator:users!created_by(id, name)
      `)
      .order('created_at', { ascending: false });

    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.reportType) {
      query = query.eq('report_type', filters.reportType);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(this.mapToReport);
  }

  /**
   * Get a single project report by ID
   */
  async getById(id: string): Promise<ProjectReport | null> {
    const { data, error } = await supabase
      .from('project_reports')
      .select(`
        *,
        project:projects(
          id,
          name,
          client:users!client_id(id, name)
        ),
        creator:users!created_by(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data ? this.mapToReport(data) : null;
  }

  /**
   * Create a new project report
   */
  async create(input: CreateReportInput & {
    reportData: ProjectReportData;
    pdfUrl: string;
    pdfFilename: string;
    fileSizeBytes: number;
  }): Promise<ProjectReport> {
    const { data, error } = await supabase
      .from('project_reports')
      .insert({
        project_id: input.projectId,
        title: input.title,
        description: input.description || null,
        report_type: input.reportType,
        report_data: input.reportData,
        pdf_url: input.pdfUrl,
        pdf_filename: input.pdfFilename,
        file_size_bytes: input.fileSizeBytes,
        status: 'generated',
      })
      .select(`
        *,
        project:projects(
          id,
          name,
          client:users!client_id(id, name)
        ),
        creator:users!created_by(id, name)
      `)
      .single();

    if (error) throw error;
    return this.mapToReport(data);
  }

  /**
   * Update report status
   */
  async updateStatus(id: string, status: ProjectReport['status']): Promise<void> {
    const updates: Record<string, unknown> = { status };

    if (status === 'sent') {
      updates.sent_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('project_reports')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Increment view count and mark as viewed on first view
   */
  async incrementViewCount(id: string): Promise<void> {
    const { data: report } = await supabase
      .from('project_reports')
      .select('view_count, first_viewed_at')
      .eq('id', id)
      .single();

    const updates: Record<string, unknown> = {
      view_count: (report?.view_count || 0) + 1,
    };

    if (!report?.first_viewed_at) {
      updates.first_viewed_at = new Date().toISOString();
      updates.status = 'viewed';
    }

    const { error } = await supabase
      .from('project_reports')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Delete a project report
   */
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_reports')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Map database row to ProjectReport type
   */
  private mapToReport(data: any): ProjectReport {
    const report: ProjectReport = {
      id: data.id,
      projectId: data.project_id,
      createdBy: data.created_by,
      title: data.title,
      description: data.description,
      reportType: data.report_type,
      reportData: data.report_data,
      pdfUrl: data.pdf_url,
      pdfFilename: data.pdf_filename,
      fileSizeBytes: data.file_size_bytes,
      status: data.status,
      sentAt: data.sent_at,
      firstViewedAt: data.first_viewed_at,
      viewCount: data.view_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Conditionally add optional relations
    if (data.project) {
      report.project = {
        id: data.project.id,
        name: data.project.name,
        client: data.project.client,
      };
    }

    if (data.creator) {
      report.creator = data.creator;
    }

    return report;
  }
}

// Export singleton instance
export const reportRepository = new ReportRepository();
