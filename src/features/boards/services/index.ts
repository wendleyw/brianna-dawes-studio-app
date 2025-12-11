export { miroClient } from './miroClient';
export { brandWorkspaceService } from './brandWorkspaceService';
export { projectRowService } from './projectRowService';

// SDK v2 services (client-side, uses window.miro)
export {
  miroTimelineService,
  miroProjectRowService,
  addVersionToProject,
  zoomToProject,
} from './miroSdkService';

// Report generation service
export { miroReportService } from './miroReportService';

// Enhanced client report service with charts
export { miroClientReportService } from './miroClientReportService';

// Project Sync Orchestrator - manages Miro ↔ Supabase synchronization
export { projectSyncOrchestrator } from './projectSyncOrchestrator';

// Master Board Service - consolidated view of all clients
export { masterBoardService } from './masterBoardService';
export type { MasterBoardSyncResult } from './masterBoardService';

// Centralized constants
export * from './constants';
