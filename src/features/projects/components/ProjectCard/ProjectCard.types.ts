import type { Project, ProjectStatus, UpdateProjectInput } from '../../domain/project.types';

export interface ProjectCardProps {
  project: Project;
  onView?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onArchive?: (project: Project, reason?: string) => void;
  onViewBoard?: (project: Project) => void;
  onUpdateGoogleDrive?: (projectId: string, googleDriveUrl: string) => void;
  onUpdateStatus?: (projectId: string, status: ProjectStatus, options?: { markAsReviewed?: boolean }) => void;
  onUpdate?: (projectId: string, input: UpdateProjectInput) => void;
  onDelete?: (projectId: string) => void;
  onReview?: (project: Project) => void;
  onComplete?: (project: Project) => void;
  onCreateVersion?: (project: Project) => void;
  onAssignDesigner?: (projectId: string, designerIds: string[]) => void;
  isSelected?: boolean;
}

// Designer with workload info for assignment modal
export interface DesignerWithWorkload {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  activeProjects: number;
  inProgressProjects: number;
}

// Deliverable suggestion based on project title
export interface DeliverableSuggestion {
  name: string;
  type: string;
  description: string;
}
