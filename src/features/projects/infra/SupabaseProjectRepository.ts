/**
 * Supabase Project Repository
 *
 * Implements IProjectRepository using Supabase as the data source.
 * This is the concrete implementation that:
 * - Uses Supabase client for database operations
 * - Emits events via the Event Bus for cross-module communication
 * - Maps between database format and domain entities
 *
 * All operations respect Supabase RLS policies for security.
 */

import { supabase } from '@shared/lib/supabase';
import { createLogger } from '@shared/lib/logger';
import { appEventBus } from '@shared/core/events/EventBus';
import type { IProjectRepository } from '@shared/core/repositories/IProjectRepository';
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectsQueryParams,
  ProjectsResponse,
  MiroSyncStatus,
} from '../domain/project.types';

const logger = createLogger('SupabaseProjectRepository');

export class SupabaseProjectRepository implements IProjectRepository {
  // ============================================================================
  // READ Operations
  // ============================================================================

  async getAll(params: ProjectsQueryParams = {}): Promise<ProjectsResponse> {
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

    // Apply filters inline to avoid TypeScript type issues with Supabase query builder
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
    if (filters.miroBoardId) {
      query = query.eq('miro_board_id', filters.miroBoardId);
    }

    // Apply sorting
    const sortColumn = this.mapSortField(sort.field);
    query = query.order(sortColumn, { ascending: sort.direction === 'asc' });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch projects', error);
      throw error;
    }

    const projects = (data || []).map(this.mapFromDB);
    const total = count || 0;

    return {
      data: projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getForDesigner(designerId: string, params: ProjectsQueryParams = {}): Promise<ProjectsResponse> {
    // First, get all project IDs for this designer
    const { data: assignments, error: assignmentsError } = await supabase
      .from('project_designers')
      .select('project_id')
      .eq('user_id', designerId);

    if (assignmentsError) {
      logger.error('Failed to fetch designer assignments', assignmentsError);
      throw assignmentsError;
    }

    const projectIds = (assignments || []).map(a => a.project_id);

    if (projectIds.length === 0) {
      return { data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 };
    }

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

    // Apply filters inline (excluding designerId since we already filtered)
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

    if (error) {
      logger.error('Failed to fetch designer projects', error);
      throw error;
    }

    const projects = (data || []).map(this.mapFromDB);
    const total = count || 0;

    return {
      data: projects,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string): Promise<Project> {
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

    if (error) {
      logger.error('Failed to fetch project', { id, error });
      throw error;
    }

    return this.mapFromDB(data);
  }

  // ============================================================================
  // WRITE Operations (with Event Emission)
  // ============================================================================

  async create(input: CreateProjectInput): Promise<Project> {
    const { designerIds, ...projectData } = input;

    // Determine sync status
    const syncStatus = projectData.syncStatus ||
      (projectData.miroBoardId ? undefined : 'not_required');

    // Use transactional RPC function
    const { data: projectId, error } = await supabase.rpc('create_project_with_designers', {
      p_name: projectData.name,
      p_client_id: projectData.clientId,
      p_description: projectData.description || null,
      p_status: projectData.status || 'in_progress',
      p_priority: projectData.priority || 'medium',
      p_start_date: projectData.startDate || null,
      p_due_date: projectData.dueDate || null,
      p_miro_board_id: projectData.miroBoardId || null,
      p_miro_board_url: projectData.miroBoardUrl || null,
      p_briefing: projectData.briefing || {},
      p_google_drive_url: projectData.googleDriveUrl || null,
      p_due_date_approved: projectData.dueDateApproved ?? true,
      p_sync_status: syncStatus,
      p_designer_ids: designerIds || [],
    });

    if (error) {
      logger.error('Failed to create project', error);
      throw error;
    }

    logger.info('Project created', { projectId });

    // Fetch the created project
    const project = await this.getById(projectId);

    // Emit event for other modules to react
    await appEventBus.emit('project:created', { project });

    return project;
  }

  async update(id: string, input: UpdateProjectInput): Promise<Project> {
    const { designerIds, ...projectData } = input;

    // Get previous state for event payload
    const previousProject = await this.getById(id);
    const previousStatus = previousProject.status;

    // Use transactional RPC function
    const { error } = await supabase.rpc('update_project_with_designers', {
      p_project_id: id,
      p_update_designers: designerIds !== undefined,
      p_name: projectData.name ?? null,
      p_description: projectData.description ?? null,
      p_status: projectData.status ?? null,
      p_priority: projectData.priority ?? null,
      p_start_date: projectData.startDate ?? null,
      p_due_date: projectData.dueDate ?? null,
      p_client_id: projectData.clientId ?? null,
      p_miro_board_id: projectData.miroBoardId ?? null,
      p_miro_board_url: projectData.miroBoardUrl ?? null,
      p_briefing: projectData.briefing ?? null,
      p_google_drive_url: projectData.googleDriveUrl ?? null,
      p_was_reviewed: projectData.wasReviewed ?? null,
      p_was_approved: projectData.wasApproved ?? null,
      p_requested_due_date: projectData.requestedDueDate ?? null,
      p_due_date_requested_at: projectData.dueDateRequestedAt ?? null,
      p_due_date_requested_by: projectData.dueDateRequestedBy ?? null,
      p_due_date_approved: projectData.dueDateApproved ?? null,
      p_thumbnail_url: projectData.thumbnailUrl ?? null,
      p_designer_ids: designerIds ?? null,
    });

    if (error) {
      logger.error('Failed to update project', { id, error });
      throw error;
    }

    logger.info('Project updated', { projectId: id });

    // Fetch the updated project
    const project = await this.getById(id);

    // Emit appropriate events
    await appEventBus.emit('project:updated', { project, previousStatus });

    // Emit status change event if status changed
    if (projectData.status && projectData.status !== previousStatus) {
      await appEventBus.emit('project:status-changed', {
        project,
        previousStatus,
        newStatus: projectData.status,
      });
    }

    return project;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('projects').delete().eq('id', id);

    if (error) {
      logger.error('Failed to delete project', { id, error });
      throw error;
    }

    logger.info('Project deleted', { projectId: id });

    // Emit event
    await appEventBus.emit('project:deleted', { projectId: id });
  }

  async archive(id: string): Promise<Project> {
    const { error } = await supabase
      .from('projects')
      .update({
        status: 'done',
        archived_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      logger.error('Failed to archive project', { id, error });
      throw error;
    }

    logger.info('Project archived', { projectId: id });

    const project = await this.getById(id);

    // Emit event
    await appEventBus.emit('project:archived', { project });

    return project;
  }

  // ============================================================================
  // Sync Operations
  // ============================================================================

  async updateSyncStatus(
    projectId: string,
    status: MiroSyncStatus,
    options?: {
      errorMessage?: string | null;
      miroCardId?: string | null;
      miroFrameId?: string | null;
      incrementRetry?: boolean;
    }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      sync_status: status,
      last_sync_attempt: new Date().toISOString(),
    };

    if (status === 'synced') {
      updateData.last_synced_at = new Date().toISOString();
      updateData.sync_error_message = null;
      updateData.sync_retry_count = 0;

      // Emit sync completed event
      await appEventBus.emit('sync:completed', {
        projectId,
        miroCardId: options?.miroCardId || undefined,
      });
    }

    if (status === 'sync_error' && options?.errorMessage) {
      updateData.sync_error_message = options.errorMessage;

      // Get current retry count for event
      const { data: currentProject } = await supabase
        .from('projects')
        .select('sync_retry_count')
        .eq('id', projectId)
        .single();

      await appEventBus.emit('sync:failed', {
        projectId,
        error: options.errorMessage,
        retryCount: (currentProject?.sync_retry_count as number) || 0,
      });
    }

    if (status === 'syncing') {
      await appEventBus.emit('sync:started', { projectId });
    }

    if (options?.incrementRetry) {
      const { error: rpcError } = await supabase.rpc('increment_sync_retry', {
        project_id: projectId,
      });
      if (rpcError) {
        logger.warn('Failed to increment retry count', rpcError);
      }
    }

    if (options?.miroCardId !== undefined) {
      updateData.miro_card_id = options.miroCardId;
    }

    if (options?.miroFrameId !== undefined) {
      updateData.miro_frame_id = options.miroFrameId;
    }

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      logger.error('Failed to update sync status', { projectId, error });
      throw error;
    }
  }

  async clearMiroReferences(
    projectId: string,
    options?: { clearCard?: boolean; clearFrame?: boolean }
  ): Promise<void> {
    const updateData: Record<string, unknown> = {
      sync_status: 'pending',
      sync_error_message: 'Miro card was deleted, will re-sync on next operation',
    };

    if (options?.clearCard !== false) {
      updateData.miro_card_id = null;
    }

    if (options?.clearFrame !== false) {
      updateData.miro_frame_id = null;
    }

    const { error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (error) {
      logger.error('Failed to clear Miro references', { projectId, error });
      throw error;
    }
  }

  async getProjectsNeedingSync(maxRetries: number = 3): Promise<Project[]> {
    const { data, error } = await supabase.rpc('get_projects_needing_sync', {
      max_retries: maxRetries,
    });

    if (error) {
      logger.error('Failed to get projects needing sync', error);
      throw error;
    }

    const projectIds = (data || []).map((p: { id: string }) => p.id);
    if (projectIds.length === 0) return [];

    const { data: projects, error: fetchError } = await supabase
      .from('projects')
      .select(`
        *,
        client:users!projects_client_id_fkey(id, name, email, avatar_url),
        designers:project_designers(user:users(id, name, email, avatar_url))
      `)
      .in('id', projectIds);

    if (fetchError) {
      logger.error('Failed to fetch projects for sync', fetchError);
      throw fetchError;
    }

    return (projects || []).map(this.mapFromDB);
  }

  async getSyncHealthMetrics(): Promise<{
    totalProjects: number;
    syncedCount: number;
    pendingCount: number;
    errorCount: number;
    syncingCount: number;
    syncSuccessRate: number;
    avgRetryCount: number;
    lastSyncError: string | null;
    lastErrorProjectName: string | null;
  }> {
    const { data, error } = await supabase.rpc('get_sync_health_metrics');

    if (error) {
      logger.error('Failed to get sync health metrics', error);
      throw error;
    }

    const metrics = data?.[0] || data;
    return {
      totalProjects: Number(metrics?.total_projects || 0),
      syncedCount: Number(metrics?.synced_count || 0),
      pendingCount: Number(metrics?.pending_count || 0),
      errorCount: Number(metrics?.error_count || 0),
      syncingCount: Number(metrics?.syncing_count || 0),
      syncSuccessRate: Number(metrics?.sync_success_rate || 100),
      avgRetryCount: Number(metrics?.avg_retry_count || 0),
      lastSyncError: metrics?.last_sync_error || null,
      lastErrorProjectName: metrics?.last_error_project_name || null,
    };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

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

  private mapFromDB(data: Record<string, unknown>): Project {
    return {
      id: data.id as string,
      name: data.name as string,
      description: data.description as string | null,
      status: data.status as Project['status'],
      priority: data.priority as Project['priority'],
      startDate: data.start_date as string | null,
      dueDate: data.due_date as string | null,
      completedAt: data.completed_at as string | null,
      archivedAt: data.archived_at as string | null,
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
      wasApproved: (data.was_approved as boolean) || false,
      requestedDueDate: data.requested_due_date as string | null,
      dueDateRequestedAt: data.due_date_requested_at as string | null,
      dueDateRequestedBy: data.due_date_requested_by as string | null,
      dueDateApproved: (data.due_date_approved as boolean) ?? true,
      syncStatus: (data.sync_status as Project['syncStatus']) || 'pending',
      syncErrorMessage: data.sync_error_message as string | null,
      syncRetryCount: (data.sync_retry_count as number) || 0,
      lastSyncAttempt: data.last_sync_attempt as string | null,
      lastSyncedAt: data.last_synced_at as string | null,
      miroCardId: data.miro_card_id as string | null,
      miroFrameId: data.miro_frame_id as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

// Export singleton instance
export const projectRepository = new SupabaseProjectRepository();
