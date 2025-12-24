// Domain
export type {
  ProjectMetrics,
  DesignerMetrics,
  ClientMetrics,
  TimelineMetrics,
  DashboardMetrics,
  ActivityItem,
  DeadlineItem,
  ReportFilters,
  ReportType,
  ProjectReport,
  ProjectReportData,
  ProjectReportType,
  CreateReportInput,
  ProjectReportFilters,
} from './domain';

// Services
export { reportService, reportKeys, reportPDFService } from './services';

// API
export { reportRepository } from './api';

// Hooks
export {
  useRecentActivity,
  useReports,
  useReport,
  useCreateReport,
  useReportMutations,
} from './hooks';

// Components
export { MetricCard, ActivityFeed } from './components';
export { CreateReportModal } from './components/CreateReportModal';
export { ProjectReportCard } from './components/ProjectReportCard';
export { ReportPDFDocument } from './components/ReportPDFDocument';

// Pages
export { DashboardPage } from './pages';
export { ClientReportsPage } from './pages/ClientReportsPage';
