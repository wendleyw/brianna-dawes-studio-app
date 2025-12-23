/**
 * Analytics types for Admin Dashboard
 */

export interface OverviewMetrics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  archivedProjects: number;
  overdueProjects: number;
  clientApprovedProjects: number;
  changesRequestedProjects: number;
  dueDateRequests: number;
  totalClients: number;
  activeClients: number;
  totalDesigners: number;
  totalBoards: number;
  activeBoards: number;
  totalDeliverables: number;
  approvedDeliverables: number;
  pendingDeliverables: number;
  overdueDeliverables: number;
  totalAssets: number;
  completionRate: number;
}

export interface ProjectsByStatus {
  overdue: number;
  urgent: number;
  in_progress: number;
  review: number;
  done: number;
  archived: number;
}

export interface ClientAnalytics {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  avatarUrl: string | null;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalDeliverables: number;
  approvedDeliverables: number;
  planId: string | null;
  planName: string | null;
  deliverablesUsed: number;
  deliverablesLimit: number;
  usagePercentage: number;
  joinedAt: string;
  lastProjectAt: string | null;
}

export interface DesignerAnalytics {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalDeliverables: number;
  approvedDeliverables: number;
  avgApprovalTime: number; // in days
  pendingReviews: number;
  joinedAt: string;
}

export interface TimelineDataPoint {
  date: string;
  projectsCreated: number;
  projectsCompleted: number;
  deliverablesCreated: number;
  deliverablesApproved: number;
  clientsJoined: number;
}

export interface MonthlyMetrics {
  month: string; // YYYY-MM format
  projectsCreated: number;
  projectsCompleted: number;
  deliverablesCreated: number;
  deliverablesApproved: number;
  newClients: number;
  revenue: number; // potential based on deliverables
}

export interface AdminDashboardData {
  overview: OverviewMetrics;
  projectsByStatus: ProjectsByStatus;
  clients: ClientAnalytics[];
  designers: DesignerAnalytics[];
  timeline: TimelineDataPoint[];
  monthlyMetrics: MonthlyMetrics[];
  recentProjects: RecentProject[];
  recentActivity: RecentActivityItem[];
}

export interface RecentProject {
  id: string;
  name: string;
  status: string;
  clientName: string;
  clientId: string;
  designerNames: string[];
  createdAt: string;
  dueDate: string | null;
  deliverablesCount: number;
  completionPercentage: number;
}

export interface RecentActivityItem {
  id: string;
  type: 'project_created' | 'project_completed' | 'deliverable_approved' | 'client_joined' | 'feedback_added';
  description: string;
  projectId: string | null;
  projectName: string | null;
  userId: string | null;
  userName: string | null;
  timestamp: string;
}

export interface AnalyticsFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  clientIds?: string[];
  designerIds?: string[];
  projectStatus?: string[];
}
