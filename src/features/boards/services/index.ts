export { miroClient } from './miroClient';
export { brandWorkspaceService } from './brandWorkspaceService';
export { projectRowService } from './projectRowService';

// SDK v2 services (client-side, uses window.miro)
export {
  miroTimelineService,
  miroProjectRowService,
  addStageToProject,
  getProjectStageCount,
  zoomToProject,
} from './miroSdkService';

// Centralized constants
export * from './constants';
