// Domain
export type {
  User,
  UserBoard,
  AppSetting,
  CreateUserInput,
  UpdateUserInput,
  AssignBoardInput,
  UpdateAppSettingInput,
  AdminTab,
  OverviewMetrics,
  ProjectsByStatus,
  ClientAnalytics,
  DesignerAnalytics,
  TimelineDataPoint,
  MonthlyMetrics,
  AdminDashboardData,
  RecentProject,
  RecentActivityItem,
  AnalyticsFilters,
} from './domain';

// Services
export { adminService, adminKeys, analyticsService, analyticsKeys } from './services';

// Hooks
export {
  useUsers,
  useUser,
  useUserMutations,
  useUserBoards,
  useAllBoards,
  useBoardAssignmentMutations,
  useAppSettings,
  useSetting,
  useAppSettingsMutations,
  useDashboardAnalytics,
  useOverviewMetrics,
  useClientAnalytics,
  useDesignerAnalytics,
  useTimelineData,
  useMonthlyMetrics,
} from './hooks';

// Components
export { UserManagement, BoardManagement, ReportModal } from './components';
export type { ReportModalProps } from './components';

// Pages
export { AdminSettingsPage, AdminDashboardPage } from './pages';
