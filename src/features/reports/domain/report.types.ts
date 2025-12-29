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

// =============================================
// PROJECT REPORTS (PDF Reports for Clients)
// =============================================

export interface ProjectReport {
  id: string;
  projectId: string;
  createdBy: string;

  // Report metadata
  title: string;
  description: string | null;
  reportType: ProjectReportType;

  // Report data snapshot
  reportData: ProjectReportData;

  // PDF storage
  pdfUrl: string;
  pdfFilename: string;
  fileSizeBytes: number | null;

  // Status
  status: 'generated' | 'sent' | 'viewed';
  sentAt: string | null;
  firstViewedAt: string | null;
  viewCount: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Relations (joined data)
  project?: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
    };
  };
  creator?: {
    id: string;
    name: string;
  };
}

export type ProjectReportType = 'project_summary' | 'milestone' | 'final';
export type ReportScope = 'project' | 'client';

export interface ProjectReportData {
  scope?: ReportScope;
  // Optional reporting period
  dateRange?: {
    startDate: string;
    endDate: string;
    label?: string;
  };

  // Optional client summary data (when scope === 'client')
  client?: {
    id: string;
    name: string;
    companyName: string | null;
  };

  projects?: Array<{
    id: string;
    name: string;
    status: string;
    priority: string;
    startDate: string | null;
    dueDate: string | null;
  }>;

  // Snapshot of project state at time of report
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    priority: string;
    startDate: string | null;
    dueDate: string | null;
    client: {
      id: string;
      name: string;
      companyName: string | null;
    };
    designers: Array<{
      id: string;
      name: string;
    }>;
  };

  // Metrics
  metrics: {
    totalDeliverables: number;
    completedDeliverables: number;
    pendingDeliverables: number;
    completionRate: number;
    totalAssets: number;
    totalBonusAssets: number;
    averageApprovalTime: number; // days
    totalFeedback: number;
    resolvedFeedback: number;
  };

  // Recent activity
  recentActivity: ActivityItem[];

  // Upcoming deadlines
  upcomingDeadlines: DeadlineItem[];

  // Custom notes from admin
  adminNotes?: string;
}

export interface CreateReportInput {
  projectId: string;
  title: string;
  description?: string;
  reportType: ProjectReportType;
  adminNotes?: string;
  startDate?: string;
  endDate?: string;
  scope?: ReportScope;
  clientId?: string;
  projectIds?: string[];
}

export interface ProjectReportFilters {
  projectId?: string;
  clientId?: string;
  reportType?: ProjectReportType;
  status?: ProjectReport['status'];
  startDate?: string;
  endDate?: string;
}
