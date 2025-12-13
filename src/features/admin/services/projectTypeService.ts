import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';

const logger = createLogger('ProjectTypeService');

/**
 * Project type as stored in database
 */
export interface ProjectType {
  id: string;
  value: string;
  label: string;
  shortLabel: string;
  days: number;
  color: string;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new project type
 */
export interface CreateProjectTypeInput {
  value: string;
  label: string;
  shortLabel: string;
  days: number;
  color: string;
  icon?: string | null;
  sortOrder?: number;
}

/**
 * Input for updating a project type
 */
export interface UpdateProjectTypeInput {
  value?: string;
  label?: string;
  shortLabel?: string;
  days?: number;
  color?: string;
  icon?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

/**
 * ProjectTypeService - Manages project types in the database
 */
class ProjectTypeService {
  /**
   * Get all active project types, sorted by sort_order
   */
  async getProjectTypes(): Promise<ProjectType[]> {
    const { data, error } = await supabase
      .from('project_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Failed to fetch project types', error);
      throw error;
    }

    return (data || []).map(this.mapFromDB);
  }

  /**
   * Get all project types including inactive ones (for admin)
   */
  async getAllProjectTypes(): Promise<ProjectType[]> {
    const { data, error } = await supabase
      .from('project_types')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Failed to fetch all project types', error);
      throw error;
    }

    return (data || []).map(this.mapFromDB);
  }

  /**
   * Get a single project type by value
   */
  async getProjectTypeByValue(value: string): Promise<ProjectType | null> {
    const { data, error } = await supabase
      .from('project_types')
      .select('*')
      .eq('value', value)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      logger.error('Failed to fetch project type', error);
      throw error;
    }

    return data ? this.mapFromDB(data) : null;
  }

  /**
   * Create a new project type
   */
  async createProjectType(input: CreateProjectTypeInput): Promise<ProjectType> {
    const { data, error } = await supabase
      .from('project_types')
      .insert({
        value: input.value,
        label: input.label,
        short_label: input.shortLabel,
        days: input.days,
        color: input.color,
        icon: input.icon || null,
        sort_order: input.sortOrder ?? 0,
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to create project type', error);
      throw error;
    }

    logger.info('Project type created', { value: input.value });
    return this.mapFromDB(data);
  }

  /**
   * Update an existing project type
   */
  async updateProjectType(id: string, input: UpdateProjectTypeInput): Promise<ProjectType> {
    const updateData: Record<string, unknown> = {};

    if (input.value !== undefined) updateData.value = input.value;
    if (input.label !== undefined) updateData.label = input.label;
    if (input.shortLabel !== undefined) updateData.short_label = input.shortLabel;
    if (input.days !== undefined) updateData.days = input.days;
    if (input.color !== undefined) updateData.color = input.color;
    if (input.icon !== undefined) updateData.icon = input.icon;
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { data, error } = await supabase
      .from('project_types')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update project type', error);
      throw error;
    }

    logger.info('Project type updated', { id });
    return this.mapFromDB(data);
  }

  /**
   * Soft delete a project type (sets is_active to false)
   */
  async deleteProjectType(id: string): Promise<void> {
    const { error } = await supabase
      .from('project_types')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete project type', error);
      throw error;
    }

    logger.info('Project type deleted (soft)', { id });
  }

  /**
   * Reactivate a deleted project type
   */
  async reactivateProjectType(id: string): Promise<ProjectType> {
    const { data, error } = await supabase
      .from('project_types')
      .update({ is_active: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to reactivate project type', error);
      throw error;
    }

    logger.info('Project type reactivated', { id });
    return this.mapFromDB(data);
  }

  /**
   * Reorder project types
   */
  async reorderProjectTypes(orderedIds: string[]): Promise<void> {
    // Update each project type with its new sort order
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('project_types')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    );

    const results = await Promise.all(updates);
    const errors = results.filter(r => r.error);

    if (errors.length > 0) {
      logger.error('Failed to reorder some project types', errors);
      throw new Error('Failed to reorder project types');
    }

    logger.info('Project types reordered');
  }

  private mapFromDB(data: Record<string, unknown>): ProjectType {
    return {
      id: data.id as string,
      value: data.value as string,
      label: data.label as string,
      shortLabel: data.short_label as string,
      days: data.days as number,
      color: data.color as string,
      icon: data.icon as string | null,
      sortOrder: data.sort_order as number,
      isActive: data.is_active as boolean,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const projectTypeService = new ProjectTypeService();
