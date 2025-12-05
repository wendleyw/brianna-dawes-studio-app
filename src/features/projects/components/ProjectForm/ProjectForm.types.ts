import type { Project, CreateProjectInput, UpdateProjectInput } from '../../domain/project.types';

export interface ProjectFormProps {
  project?: Project;
  onSubmit: (data: CreateProjectInput | UpdateProjectInput) => void | Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  dueDate: string;
  clientId: string;
  designerIds: string[];
}
