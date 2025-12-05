import type { Project, ProjectsQueryParams } from '../../domain/project.types';

export interface ProjectListProps {
  params?: ProjectsQueryParams;
  onProjectClick?: (project: Project) => void;
  onProjectEdit?: (project: Project) => void;
  onViewBoard?: (project: Project) => void;
  onUpdateGoogleDrive?: (projectId: string, googleDriveUrl: string) => void;
  emptyMessage?: string;
}
