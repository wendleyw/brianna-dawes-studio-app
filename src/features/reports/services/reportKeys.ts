import type { ProjectReportFilters } from '../domain/report.types';

export const reportKeys = {
  all: ['reports'] as const,
  activity: (limit?: number) => [...reportKeys.all, 'activity', limit] as const,

  // Project Reports (PDF reports for clients)
  projectReports: {
    all: ['project-reports'] as const,
    lists: () => [...reportKeys.projectReports.all, 'list'] as const,
    list: (filters: ProjectReportFilters) =>
      [...reportKeys.projectReports.lists(), filters] as const,
    details: () => [...reportKeys.projectReports.all, 'detail'] as const,
    detail: (id: string) => [...reportKeys.projectReports.details(), id] as const,
  },
};
