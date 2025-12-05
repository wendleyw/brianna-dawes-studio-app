// Domain
export type {
  ProjectStatus,
  ProjectPriority,
  ProjectClient,
  ProjectDesigner,
  ProjectBriefing,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectFilters,
  ProjectSort,
  ProjectsQueryParams,
  ProjectsResponse,
} from './domain';

export {
  projectStatusSchema,
  projectPrioritySchema,
  createProjectSchema,
  updateProjectSchema,
  projectFiltersSchema,
} from './domain';

export type {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectFiltersSchema,
} from './domain';

// Services
export { projectService, projectKeys } from './services';

// Hooks
export {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useProjectMutations,
  useCreateProjectWithMiro,
  useUpdateProjectWithMiro,
  useDeleteProjectWithMiro,
  useProjectMutationsWithMiro,
} from './hooks';

// Components
export { ProjectCard, ProjectList, ProjectFilters as ProjectFiltersComponent, ProjectForm } from './components';
export type {
  ProjectCardProps,
  ProjectListProps,
  ProjectFiltersProps,
  ProjectFormProps,
  ProjectFormData,
} from './components';

// Pages
export { ProjectsPage, ProjectDetailPage, NewProjectPage } from './pages';
