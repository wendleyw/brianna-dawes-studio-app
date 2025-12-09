// Domain
export type {
  MiroBoard,
  MiroFrame,
  MiroStickyNote,
  MiroCard,
  KanbanColumnId,
  KanbanColumn,
  KanbanCard,
  KanbanBoardState,
  WorkspaceSection,
  BrandWorkspace,
  SyncResult,
  SyncConfig,
  TimelineStatus,
  TimelineColumn,
  TimelineCard,
  MasterTimelineState,
  ProjectBriefing,
  BriefingField,
  ProjectRowState,
} from './domain';

// Context
export { MiroProvider, MiroContext, useMiro } from './context';
export type {
  MiroItem,
  MiroFrame as MiroFrameItem,
  MiroShape,
  MiroText,
  MiroCard as MiroCardItem,
  MiroStickyNote as MiroStickyNoteItem,
} from './context/MiroContext';

// Services
export {
  miroClient,
  brandWorkspaceService,
  projectRowService,
  miroTimelineService,
  miroProjectRowService,
  addVersionToProject,
  zoomToProject,
  miroReportService,
  miroClientReportService,
} from './services';

// Hooks
export { useMiroBoardSync } from './hooks';

// Components
export { KanbanBoard } from './components';
export type { KanbanBoardProps } from './components';
