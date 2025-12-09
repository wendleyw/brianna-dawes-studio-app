// 5 Timeline Statuses - simplified workflow
export type ProjectStatus =
  | 'overdue'       // Past due date (includes critical)
  | 'urgent'        // High priority, deadline approaching
  | 'in_progress'   // Actively being worked on (default, includes on_track)
  | 'review'        // Awaiting client review/approval
  | 'done';         // Completed or archived

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';

// Miro Sync Status - tracks synchronization state with Miro boards
export type MiroSyncStatus =
  | 'pending'       // Project created, waiting for Miro sync
  | 'syncing'       // Currently syncing to Miro
  | 'synced'        // Successfully synced with Miro
  | 'sync_error'    // Sync failed, needs retry
  | 'not_required'; // Project doesn't need Miro sync

export interface ProjectClient {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface ProjectDesigner {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

// Project Types
export type ProjectType =
  | 'website-ui-design'
  | 'marketing-campaign'
  | 'video-production'
  | 'email-design'
  | 'social-post-carousel';

// Project Briefing
export interface ProjectBriefing {
  projectType?: string | null;
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

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  clientId: string;
  client: ProjectClient | null;
  designers: ProjectDesigner[];
  miroBoardId: string | null;
  miroBoardUrl: string | null;
  googleDriveUrl: string | null;
  thumbnailUrl: string | null;
  deliverablesCount: number;
  briefing: ProjectBriefing | null;
  wasReviewed: boolean;
  wasApproved: boolean;
  // Due date request fields (for client approval workflow)
  requestedDueDate: string | null;
  dueDateRequestedAt: string | null;
  dueDateRequestedBy: string | null;
  // Due date approval status (false = "Em análise" until admin approves)
  dueDateApproved: boolean;
  // Miro sync tracking fields
  syncStatus: MiroSyncStatus;
  syncErrorMessage: string | null;
  syncRetryCount: number;
  lastSyncAttempt: string | null;
  lastSyncedAt: string | null;
  miroCardId: string | null;
  miroFrameId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
  clientId: string;
  designerIds?: string[];
  miroBoardId?: string | null;
  miroBoardUrl?: string | null;
  briefing?: Partial<ProjectBriefing> | null;
  googleDriveUrl?: string | null;
  // Due date approval (false = custom date needs approval)
  dueDateApproved?: boolean;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
  clientId?: string;
  designerIds?: string[];
  miroBoardId?: string | null;
  miroBoardUrl?: string | null;
  googleDriveUrl?: string | null;
  thumbnailUrl?: string | null;
  briefing?: Partial<ProjectBriefing> | null;
  wasReviewed?: boolean;
  wasApproved?: boolean;
  // Due date request fields
  requestedDueDate?: string | null;
  dueDateRequestedAt?: string | null;
  dueDateRequestedBy?: string | null;
  // Due date approval
  dueDateApproved?: boolean;
}

export interface ProjectFilters {
  status?: ProjectStatus | ProjectStatus[];
  priority?: ProjectPriority | ProjectPriority[];
  clientId?: string;
  designerId?: string;
  search?: string;
  startDateFrom?: string;
  startDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
}

export interface ProjectSort {
  field: 'name' | 'createdAt' | 'updatedAt' | 'dueDate' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface ProjectsQueryParams {
  filters?: ProjectFilters;
  sort?: ProjectSort;
  page?: number;
  pageSize?: number;
}

export interface ProjectsResponse {
  data: Project[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
