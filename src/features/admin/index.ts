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
} from './domain';

// Services
export { adminService, adminKeys } from './services';

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
} from './hooks';

// Components
export { UserManagement, BoardManagement, ReportModal } from './components';
export type { ReportModalProps } from './components';

// Pages
export { AdminSettingsPage } from './pages';
