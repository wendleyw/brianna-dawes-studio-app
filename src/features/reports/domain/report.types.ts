export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalDeliverables: number;
  completedDeliverables: number;
  pendingDeliverables: number;
  overdueDeliverables: number;
  completionRate: number;
  averageApprovalTime: number; // in days
  totalFeedback: number;
  resolvedFeedback: number;
}

export interface DesignerMetrics {
  designerId: string;
  designerName: string;
  avatarUrl: string | null;
  projectsCount: number;
  deliverablesCreated: number;
  deliverablesApproved: number;
  averageApprovalRate: number;
  feedbackReceived: number;
}

export interface ClientMetrics {
  clientId: string;
  clientName: string;
  avatarUrl: string | null;
  projectsCount: number;
  activeProjects: number;
  completedProjects: number;
  totalSpent: number;
  averageProjectDuration: number; // in days
}

export interface TimelineMetrics {
  date: string;
  deliverablesCreated: number;
  deliverablesApproved: number;
  deliverablesRejected: number;
  feedbackCount: number;
}

export interface DashboardMetrics {
  activeProjects: number;
  pendingReviews: number;
  overdueDeliverables: number;
  completionRate: number;
  totalAssets: number;
  totalBonusAssets: number;
  projectsByStatus: { status: string; count: number }[];
  deliverablesByType: { type: string; count: number }[];
  recentActivity: ActivityItem[];
  upcomingDeadlines: DeadlineItem[];
}

export interface ActivityItem {
  id: string;
  type: 'deliverable_created' | 'version_uploaded' | 'feedback_added' | 'status_changed' | 'project_created';
  itemName: string;
  projectName: string;
  projectId: string;
  userName: string | null;
  userId: string | null;
  timestamp: string;
}

export interface DeadlineItem {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  daysRemaining: number;
  status: string;
  priority: string;
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  projectIds?: string[];
  designerIds?: string[];
  clientIds?: string[];
}

export type ReportType = 'dashboard' | 'project' | 'designer' | 'client' | 'timeline';
