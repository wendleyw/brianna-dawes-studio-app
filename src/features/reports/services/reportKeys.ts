import type { ReportFilters } from '../domain/report.types';

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  project: (projectId: string) => [...reportKeys.all, 'project', projectId] as const,
  designer: (designerId: string) => [...reportKeys.all, 'designer', designerId] as const,
  timeline: (filters: ReportFilters) => [...reportKeys.all, 'timeline', filters] as const,
  activity: (limit?: number) => [...reportKeys.all, 'activity', limit] as const,
};
