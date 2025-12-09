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
} from './domain';

// Services
export { reportService, reportKeys } from './services';

// Hooks
export { useRecentActivity } from './hooks';

// Components
export { MetricCard, ActivityFeed } from './components';

// Pages
export { DashboardPage } from './pages';
