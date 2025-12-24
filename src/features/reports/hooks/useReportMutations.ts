import { useMutation, useQueryClient } from '@tanstack/react-query';
import { reportRepository } from '../api/reportRepository';
import { reportPDFService } from '../services/reportPDFService';
import { reportKeys } from '../services/reportKeys';

/**
 * Hook for project report mutations (update, delete)
 */
export function useReportMutations() {
  const queryClient = useQueryClient();

  const incrementViewCount = useMutation({
    mutationFn: (reportId: string) => reportRepository.incrementViewCount(reportId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.projectReports.all });
    },
  });

  const deleteReport = useMutation({
    mutationFn: async (report: { id: string; pdfUrl: string }) => {
      // Delete PDF from storage first
      await reportPDFService.deletePDF(report.pdfUrl);
      // Then delete from database
      await reportRepository.delete(report.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportKeys.projectReports.all });
    },
  });

  return {
    incrementViewCount,
    deleteReport,
  };
}
