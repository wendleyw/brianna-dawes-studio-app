import { supabase } from '@shared/lib/supabase';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectsQueryParams,
  ProjectsResponse,
} from '../domain/project.types';

/**
 * ProjectService - Handles all project-related database operations
 *
 * This service provides CRUD operations for projects, including:
 * - Fetching projects with filtering, sorting, and pagination
 * - Creating new projects with briefing and designer assignments
 * - Updating project details and status
 * - Deleting projects (admin only)
 *
 * All operations respect Supabase RLS policies for security.
 *
 * @example
 * ```typescript
 * // Get paginated projects with filters
 * const { data, total } = await projectService.getProjects({
 *   filters: { status: 'in_progress' },
 *   sort: { field: 'dueDate', direction: 'asc' },
 *   page: 1,
 *   pageSize: 10
 * });
 *
 * // Create a new project
 * const project = await projectService.createProject({
 *   name: 'Website Redesign',
 *   clientId: 'uuid',
 *   priority: 'high'
 * });
 * ```
 */
class ProjectService {
  /**
   * Get projects with optional filtering, sorting, and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Paginated project list with total count
   */
  async getProjects(params: ProjectsQueryParams = {}): Promise<ProjectsResponse> {
    const { filters = {}, sort = { field: 'createdAt', direction: 'desc' }, page = 1, pageSize = 10 } = params;

    let query = supabase
      .from('projects')
      .select(
        `
        *,
        client:users!projects_client_id_fkey(id, name, email, avatar_url),
        designers:project_designers(user:users(id, name, email, avatar_url))
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.priority) {
      if (Array.isArray(filters.priority)) {
        query = query.in('priority', filters.priority);
      } else {
        query = query.eq('priority', filters.priority);
      }
    }

    if (filters.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    // Note: designerId filter is handled separately via getProjectsForDesigner()

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.startDateFrom) {
      query = query.gte('start_date', filters.startDateFrom);
    }

    if (filters.startDateTo) {
      query = query.lte('start_date', filters.startDateTo);
    }

    if (filters.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom);
    }

    if (filters.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo);
    }

    // Apply sorting
    const sortColumn = this.mapSortField(sort.field);
    query = query.order(sortColumn, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const projects = (data || []).map(this.mapProjectFromDB);
    const total = count || 0;

    return {
      data: projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProjectsForDesigner(designerId: string, params: ProjectsQueryParams = {}): Promise<ProjectsResponse> {
    // First, get all project IDs for this designer
    const { data: assignments, error: assignmentsError } = await supabase
      .from('project_designers')
      .select('project_id')
      .eq('user_id', designerId);

    if (assignmentsError) throw assignmentsError;

    const projectIds = (assignments || []).map(a => a.project_id);

    if (projectIds.length === 0) {
      return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }

    // Now fetch projects with the same params but filtered by IDs
    const { filters = {}, sort = { field: 'createdAt', direction: 'desc' }, page = 1, pageSize = 10 } = params;

    let query = supabase
      .from('projects')
      .select(
        `
        *,
        client:users!projects_client_id_fkey(id, name, email, avatar_url),
        designers:project_designers(user:users(id, name, email, avatar_url))
      `,
        { count: 'exact' }
      )
      .in('id', projectIds);

    // Apply filters
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status);
      } else {
        query = query.eq('status', filters.status);
      }
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Apply sorting
    const sortColumn = this.mapSortField(sort.field);
    query = query.order(sortColumn, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) throw error;

    const projects = (data || []).map(this.mapProjectFromDB);
    const total = count || 0;

    return {
      data: projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getProject(id: string): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .select(
        `
        *,
        client:users!projects_client_id_fkey(id, name, email, avatar_url),
        designers:project_designers(user:users(id, name, email, avatar_url))
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapProjectFromDB(data);
  }

  async createProject(input: CreateProjectInput): Promise<Project> {
    const { designerIds, ...projectData } = input;

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: projectData.name,
        description: projectData.description,
        status: projectData.status || 'in_progress',
        priority: projectData.priority || 'medium',
        start_date: projectData.startDate,
        due_date: projectData.dueDate,
        client_id: projectData.clientId,
        miro_board_id: projectData.miroBoardId,
        miro_board_url: projectData.miroBoardUrl,
        briefing: projectData.briefing || {},
        google_drive_url: projectData.googleDriveUrl,
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Add designers if provided
    if (designerIds && designerIds.length > 0) {
      const designerInserts = designerIds.map((userId) => ({
        project_id: project.id,
        user_id: userId,
      }));

      const { error: designerError } = await supabase
        .from('project_designers')
        .insert(designerInserts);

      if (designerError) throw designerError;
    }

    return this.getProject(project.id);
  }

  async updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
    const { designerIds, ...projectData } = input;

    const updateData: Record<string, unknown> = {};
    if (projectData.name !== undefined) updateData.name = projectData.name;
    if (projectData.description !== undefined) updateData.description = projectData.description;
    if (projectData.status !== undefined) updateData.status = projectData.status;
    if (projectData.priority !== undefined) updateData.priority = projectData.priority;
    if (projectData.startDate !== undefined) updateData.start_date = projectData.startDate;
    if (projectData.dueDate !== undefined) updateData.due_date = projectData.dueDate;
    if (projectData.clientId !== undefined) updateData.client_id = projectData.clientId;
    if (projectData.miroBoardId !== undefined) updateData.miro_board_id = projectData.miroBoardId;
    if (projectData.miroBoardUrl !== undefined) updateData.miro_board_url = projectData.miroBoardUrl;
    if (projectData.thumbnailUrl !== undefined) updateData.thumbnail_url = projectData.thumbnailUrl;
    if (projectData.briefing !== undefined) updateData.briefing = projectData.briefing;
    if (projectData.googleDriveUrl !== undefined) updateData.google_drive_url = projectData.googleDriveUrl;
    if (projectData.wasReviewed !== undefined) updateData.was_reviewed = projectData.wasReviewed;

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select();

      if (error) throw error;
    }

    // Update designers if provided
    if (designerIds !== undefined) {
      // Remove existing designers
      await supabase.from('project_designers').delete().eq('project_id', id);

      // Add new designers
      if (designerIds.length > 0) {
        const designerInserts = designerIds.map((userId) => ({
          project_id: id,
          user_id: userId,
        }));

        const { error: designerError } = await supabase
          .from('project_designers')
          .insert(designerInserts);

        if (designerError) throw designerError;
      }
    }

    return this.getProject(id);
  }

  async deleteProject(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
  }

  async archiveProject(id: string): Promise<Project> {
    // Archive now maps to 'done' status
    return this.updateProject(id, { status: 'done' });
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      dueDate: 'due_date',
      priority: 'priority',
      status: 'status',
    };
    return fieldMap[field] || 'created_at';
  }

  private mapProjectFromDB(data: Record<string, unknown>): Project {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | null,
      status: data.status as Project['status'],
      priority: data.priority as Project['priority'],
      startDate: data.start_date as string | null,
      dueDate: data.due_date as string | null,
      completedAt: data.completed_at as string | null,
      clientId: data.client_id as string,
      client: data.client
        ? {
            id: (data.client as Record<string, unknown>).id as string,
            name: (data.client as Record<string, unknown>).name as string,
            email: (data.client as Record<string, unknown>).email as string,
            avatarUrl: (data.client as Record<string, unknown>).avatar_url as string | null,
          }
        : null,
      designers: ((data.designers as Array<{ user: Record<string, unknown> }>) || []).map((d) => ({
        id: d.user.id as string,
        name: d.user.name as string,
        email: d.user.email as string,
        avatarUrl: d.user.avatar_url as string | null,
      })),
      miroBoardId: data.miro_board_id as string | null,
      miroBoardUrl: data.miro_board_url as string | null,
      googleDriveUrl: data.google_drive_url as string | null,
      thumbnailUrl: data.thumbnail_url as string | null,
      deliverablesCount: (data.deliverables_count as number) || 0,
      briefing: data.briefing as Project['briefing'] || null,
      wasReviewed: (data.was_reviewed as boolean) || false,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const projectService = new ProjectService();
