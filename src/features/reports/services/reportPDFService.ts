import { pdf } from '@react-pdf/renderer';
import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import type { ProjectReportData } from '../domain/report.types';

const logger = createLogger('ReportPDFService');
const REPORTS_BUCKET = 'project-reports';

function extractStoragePath(pdfUrl: string): string | null {
  const prefixes = [
    `/storage/v1/object/public/${REPORTS_BUCKET}/`,
    `/storage/v1/object/sign/${REPORTS_BUCKET}/`,
    `/storage/v1/object/${REPORTS_BUCKET}/`,
  ];

  const stripPrefix = (path: string) => {
    for (const prefix of prefixes) {
      if (path.startsWith(prefix)) {
        return path.slice(prefix.length);
      }
    }
    return null;
  };

  if (pdfUrl.startsWith(`${REPORTS_BUCKET}/`)) {
    return pdfUrl.slice(`${REPORTS_BUCKET}/`.length);
  }

  if (pdfUrl.startsWith('/')) {
    const stripped = stripPrefix(pdfUrl);
    if (stripped) return stripped;
  }

  try {
    const url = new URL(pdfUrl);
    const stripped = stripPrefix(url.pathname);
    if (stripped) return stripped;
  } catch (error) {
    logger.warn('Failed to parse PDF URL', error);
  }

  return null;
}

/**
 * Service for generating PDF reports and managing storage
 */
export class ReportPDFService {
  /**
   * Generate PDF blob from report data using React-PDF
   * Note: The actual PDF document component will be passed in
   */
  async generatePDFBlob(
    ReportPDFDocument: any,
    reportData: ProjectReportData
  ): Promise<Blob> {
    try {
      logger.debug('Generating PDF blob', { projectId: reportData.project.id });

      const blob = await pdf(ReportPDFDocument({ data: reportData })).toBlob();

      logger.debug('PDF blob generated', { size: blob.size });
      return blob;
    } catch (error) {
      logger.error('Failed to generate PDF blob', error);
      throw new Error('Failed to generate PDF');
    }
  }

  /**
   * Upload PDF to Supabase Storage
   * Path format: {projectId}/{timestamp}_{filename}.pdf
   */
  async uploadPDF(
    projectId: string,
    filename: string,
    blob: Blob
  ): Promise<{ url: string; path: string }> {
    try {
      const timestamp = new Date().getTime();
      const sanitizedFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_');
      const path = `${projectId}/${timestamp}_${sanitizedFilename}.pdf`;

      logger.debug('Uploading PDF to storage', { path });

      const { data, error } = await supabase.storage
        .from(REPORTS_BUCKET)
        .upload(path, blob, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL (will use RLS for access control)
      const {
        data: { publicUrl },
      } = supabase.storage.from(REPORTS_BUCKET).getPublicUrl(path);

      logger.debug('PDF uploaded successfully', { url: publicUrl });

      return {
        url: publicUrl,
        path: data.path,
      };
    } catch (error) {
      logger.error('Failed to upload PDF', error);
      throw new Error('Failed to upload PDF to storage');
    }
  }

  /**
   * Delete PDF from storage
   */
  async deletePDF(pdfUrl: string): Promise<void> {
    try {
      const path = extractStoragePath(pdfUrl);

      if (!path) {
        throw new Error('Invalid PDF URL format');
      }

      const { error } = await supabase.storage.from(REPORTS_BUCKET).remove([path]);

      if (error) throw error;

      logger.debug('PDF deleted successfully', { path });
    } catch (error) {
      logger.error('Failed to delete PDF', error);
      // Don't throw - deletion is not critical
    }
  }

  /**
   * Get signed URL for PDF download
   * Signed URLs expire after specified time (default 1 hour)
   */
  async getDownloadURL(pdfUrl: string, expiresIn: number = 3600): Promise<string> {
    try {
      if (pdfUrl.includes('/storage/v1/object/sign/') || pdfUrl.includes('?token=')) {
        return pdfUrl;
      }

      const path = extractStoragePath(pdfUrl);

      if (!path) {
        return pdfUrl;
      }

      const { data, error } = await supabase.storage
        .from(REPORTS_BUCKET)
        .createSignedUrl(path, expiresIn);

      if (error) {
        logger.warn('Signed URL request failed, using stored URL', error);
        return pdfUrl;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error('Failed to get download URL', error);
      return pdfUrl;
    }
  }
}

// Export singleton instance
export const reportPDFService = new ReportPDFService();
