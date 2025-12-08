// Miro SDK Types
export interface MiroBoard {
  id: string;
  name: string;
  description: string;
  viewLink: string;
  accessLink: string;
  createdAt: string;
  modifiedAt: string;
}

export interface MiroFrame {
  id: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MiroStickyNote {
  id: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    fillColor: string;
    textAlign: 'left' | 'center' | 'right';
    textAlignVertical: 'top' | 'middle' | 'bottom';
  };
}

export interface MiroCard {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: {
    cardTheme: string;
  };
  dueDate?: string;
  assignee?: {
    userId: string;
  };
  tags?: { title: string; color: string }[];
}

// Kanban Types
export type KanbanColumnId = 'backlog' | 'in_progress' | 'review' | 'done';

export interface KanbanColumn {
  id: KanbanColumnId;
  title: string;
  color: string;
  frameId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface KanbanCard {
  id: string;
  deliverableId: string;
  projectId: string;
  name: string;
  status: string;
  priority: string;
  dueDate: string | null;
  miroCardId: string | null;
  columnId: KanbanColumnId;
  position: number;
}

export interface KanbanBoardState {
  columns: KanbanColumn[];
  cards: KanbanCard[];
  lastSyncAt: string | null;
}

// Brand Workspace Types
export interface WorkspaceSection {
  id: string;
  name: string;
  frameId: string | null;
  type: 'logo' | 'colors' | 'typography' | 'imagery' | 'guidelines';
  position: { x: number; y: number };
  size: { width: number; height: number };
}

export interface BrandWorkspace {
  projectId: string;
  boardId: string;
  sections: WorkspaceSection[];
  createdAt: string;
  updatedAt: string;
}

// Sync Types
export interface SyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  timestamp: string;
}

export interface SyncConfig {
  autoSync: boolean;
  syncInterval: number; // in milliseconds
  conflictResolution: 'miro_wins' | 'supabase_wins' | 'manual';
}

// Master Timeline Types - unified 7-status system (matches DB enum from migration 013)
export type TimelineStatus = 'critical' | 'overdue' | 'urgent' | 'on_track' | 'in_progress' | 'review' | 'done';

export interface TimelineColumn {
  id: TimelineStatus;
  label: string;
  color: string;
  x: number;
  y?: number;  // Y position for vertical layout
  width: number;
}

export interface TimelineCard {
  id: string;
  projectId: string;
  projectName: string;
  clientName: string | null;
  dueDate: string | null;
  status: TimelineStatus;
  miroCardId: string | null;
  x: number;
  y: number;
}

export interface MasterTimelineState {
  frameId: string | null;
  columns: TimelineColumn[];
  cards: TimelineCard[];
  lastSyncAt: string | null;
}

// Project Briefing Types
export interface ProjectBriefing {
  projectOverview: string | null;
  finalMessaging: string | null;
  inspirations: string | null;
  targetAudience: string | null;
  deliverables: string | null;
  styleNotes: string | null;
  goals: string | null;
  timeline: string | null;
  resourceLinks: string | null;
  additionalNotes: string | null;
}

export interface BriefingField {
  key: keyof ProjectBriefing;
  label: string;
  value: string | null;
}

// Project Row Types
export interface ProjectRowState {
  projectId: string;
  projectName: string;
  clientName: string;
  briefingFrameId: string | null;
  processFrameId: string | null;
  y: number;
  briefingItems: Array<{ id: string; miroItemId: string | null; fieldKey: string }>;
  processStages: Array<{ id: string; miroItemId: string | null; stageName: string }>;
}
