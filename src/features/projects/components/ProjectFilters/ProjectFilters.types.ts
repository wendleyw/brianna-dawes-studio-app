import type { ProjectFilters, ProjectSort } from '../../domain/project.types';

export interface ProjectFiltersProps {
  filters: ProjectFilters;
  sort: ProjectSort;
  onFiltersChange: (filters: ProjectFilters) => void;
  onSortChange: (sort: ProjectSort) => void;
  onReset?: () => void;
}
