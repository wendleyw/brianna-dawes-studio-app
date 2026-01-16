import { useMemo } from 'react';
import { useProjectTypes } from './useProjectTypes';
import type { ProjectType } from '@features/admin/services/projectTypeService';

export interface ProjectTypeConfig {
  label: string;
  shortLabel: string;
  color: string;
  icon: string | null;
  days: number;
}

/**
 * Hook that provides a lookup function for project types from the database.
 * Returns a function that can be used to get project type config by value.
 */
export function useProjectTypeConfig() {
  const { data: projectTypes = [], isLoading } = useProjectTypes();

  // Create a lookup map from project type value to config
  const projectTypeMap = useMemo(() => {
    const map = new Map<string, ProjectTypeConfig>();
    projectTypes.forEach((pt: ProjectType) => {
      map.set(pt.value, {
        label: pt.shortLabel || pt.label,
        shortLabel: pt.shortLabel,
        color: pt.color,
        icon: pt.icon,
        days: pt.days,
      });
    });
    return map;
  }, [projectTypes]);

  /**
   * Get project type config by value
   * Checks briefing.projectType first, then tries to extract from description/timeline
   */
  const getProjectType = useMemo(() => {
    return (
      project: {
        briefing?: { timeline?: string | null; projectType?: string | null } | null;
        description?: string | null;
      }
    ): ProjectTypeConfig | null => {
      // Check briefing.projectType first (most reliable source)
      if (project.briefing?.projectType) {
        const config = projectTypeMap.get(project.briefing.projectType);
        if (config) return config;
      }

      // Try to extract from briefing.timeline and description
      const timeline = project.briefing?.timeline || '';
      const desc = project.description || '';
      const textToSearch = (timeline + ' ' + desc).toLowerCase();

      // Match against project type values and labels
      for (const [value, config] of projectTypeMap.entries()) {
        if (
          textToSearch.includes(value) ||
          textToSearch.includes(config.label.toLowerCase()) ||
          textToSearch.includes(config.shortLabel.toLowerCase())
        ) {
          return config;
        }
      }

      return null;
    };
  }, [projectTypeMap]);

  return {
    getProjectType,
    projectTypes,
    projectTypeMap,
    isLoading,
  };
}
