export type AdminTab =
  | 'overview'
  | 'analytics'
  | 'users'
  | 'projects'
  | 'activity'
  | 'settings';

export interface DashboardStats {
  totalProjects: number;
  totalUsers: number;
  activeProjects: number;
  syncHealth: number; // percentage
  projectsByStatus: {
    draft: number;
    in_progress: number;
    review: number;
    done: number;
    archived: number;
  };
}

export interface RecentActivity {
  id: string;
  type: 'project_created' | 'project_updated' | 'user_added' | 'deliverable_uploaded' | 'sync_completed' | 'sync_failed';
  message: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'designer' | 'client';
  projectId?: string;
  projectName?: string;
  timestamp: string;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  message: string;
  count?: number;
  actionLabel?: string;
  actionLink?: string;
}

export interface UserStats {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'designer' | 'client';
  projectCount: number;
  lastActive: string;
  status: 'active' | 'pending' | 'inactive';
  avatarUrl?: string;
}

export interface ProjectOverview {
  id: string;
  name: string;
  clientName: string;
  status: 'draft' | 'in_progress' | 'review' | 'done' | 'archived';
  designerName: string;
  deliverableCount: number;
  completedDeliverables: number;
  lastUpdated: string;
  dueDate?: string;
  isOverdue: boolean;
}

export interface AnalyticsData {
  dateRange: {
    start: string;
    end: string;
  };
  projectsByStatus: Array<{ status: string; count: number }>;
  deliverablesCompletionRate: Array<{ date: string; rate: number }>;
  userActivityHeatmap: Array<{ date: string; userId: string; activityCount: number }>;
  syncHealthHistory: Array<{ timestamp: string; successRate: number }>;
}

export interface SystemSettings {
  studioName: string;
  timezone: string;
  language: string;
  miroBoardTemplateId?: string;
  autoSyncInterval: number; // minutes
  sessionTimeout: number; // minutes
  require2FA: boolean;
}
