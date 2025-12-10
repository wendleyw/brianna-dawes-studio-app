import { supabase } from '@shared/lib/supabase';
import {
  mapDeliverableStatusToDb,
  mapDeliverableStatusArrayToDb,
  mapDeliverableTypeToDb,
  mapDeliverableTypeArrayToDb,
  mapMimeTypeToDeliverableType,
} from '@shared/lib/statusMapping';
import type {
  Deliverable,
  DeliverableVersion,
  DeliverableFeedback,
  CreateDeliverableInput,
  UpdateDeliverableInput,
  UploadVersionInput,
  DeliverablesQueryParams,
  DeliverablesResponse,
} from '../domain/deliverable.types';

/**
 * DeliverableService - Handles all deliverable-related database operations
 *
 * This service provides CRUD operations for deliverables, including:
 * - Fetching deliverables with filtering, sorting, and pagination
 * - Creating, updating, and deleting deliverables
 * - Managing deliverable versions and file uploads
 * - Handling feedback on deliverables
 *
 * All operations respect Supabase RLS policies for security.
 *
 * @example
 * ```typescript
 * const { data, total } = await deliverableService.getDeliverables({
 *   filters: { projectId: 'uuid', status: 'pending' },
 *   page: 1,
 *   pageSize: 10
 * });
 * ```
 */
class DeliverableService {
  async getDeliverables(params: DeliverablesQueryParams = {}): Promise<DeliverablesResponse> {
    const { filters = {}, sort = { field: 'createdAt', direction: 'desc' }, page = 1, pageSize = 10 } = params;

    let query = supabase
      .from('deliverables')
      .select(
        `
        *,
        current_version:deliverable_versions!fk_deliverables_current_version(
          id, version_number, file_url, file_name, file_size, mime_type, comment, created_at,
          uploaded_by:users(id, name, avatar_url)
        )
      `,
        { count: 'exact' }
      );

    // Apply filters
    if (filters.projectId) {
      query = query.eq('project_id', filters.projectId);
    }

    if (filters.status) {
      // Map UI status to DB status
      if (Array.isArray(filters.status)) {
        const mappedStatuses = mapDeliverableStatusArrayToDb(filters.status);
        query = query.in('status', mappedStatuses);
      } else {
        const mappedStatus = mapDeliverableStatusToDb(filters.status);
        query = query.eq('status', mappedStatus);
      }
    }

    if (filters.type) {
      // Map UI type to DB type
      if (Array.isArray(filters.type)) {
        const mappedTypes = mapDeliverableTypeArrayToDb(filters.type);
        query = query.in('type', mappedTypes);
      } else {
        const mappedType = mapDeliverableTypeToDb(filters.type);
        query = query.eq('type', mappedType);
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

    const deliverables = (data || []).map(this.mapDeliverableFromDB);
    const total = count || 0;

    return {
      data: deliverables,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getDeliverable(id: string): Promise<Deliverable> {
    const { data, error } = await supabase
      .from('deliverables')
      .select(
        `
        *,
        current_version:deliverable_versions!fk_deliverables_current_version(
          id, version_number, file_url, file_name, file_size, mime_type, comment, created_at,
          uploaded_by:users(id, name, avatar_url)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return this.mapDeliverableFromDB(data);
  }

  async createDeliverable(input: CreateDeliverableInput): Promise<Deliverable> {
    // Map type and status to DB-compatible values
    const inputType = input.type || 'design';
    const dbType = mapDeliverableTypeToDb(inputType);
    const inputStatus = input.status || 'draft';
    const dbStatus = mapDeliverableStatusToDb(inputStatus);

    const insertData: Record<string, unknown> = {
      project_id: input.projectId,
      name: input.name,
      description: input.description || null,
      type: dbType,
      status: dbStatus,
      due_date: input.dueDate,
      // Save links and count to actual columns
      external_url: input.externalUrl || null,
      miro_url: input.miroUrl || null,
      count: input.count || 1,
      // bonus_count will be set after migration 017 is applied
      ...(input.bonusCount ? { bonus_count: input.bonusCount } : {}),
      // delivered_at for completed deliverables (for reports)
      ...(input.deliveredAt ? { delivered_at: input.deliveredAt } : {}),
    };

    const { data, error } = await supabase
      .from('deliverables')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    return this.getDeliverable(data.id);
  }

  async updateDeliverable(id: string, input: UpdateDeliverableInput): Promise<Deliverable> {
    const updateData: Record<string, unknown> = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.type !== undefined) updateData.type = mapDeliverableTypeToDb(input.type);
    if (input.status !== undefined) updateData.status = mapDeliverableStatusToDb(input.status);
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
    if (input.externalUrl !== undefined) updateData.external_url = input.externalUrl;
    if (input.miroUrl !== undefined) updateData.miro_url = input.miroUrl;
    if (input.count !== undefined) updateData.count = input.count;
    // bonus_count - only set if provided with value (column added in migration 017)
    if (input.bonusCount) updateData.bonus_count = input.bonusCount;

    if (input.status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    updateData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('deliverables')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
    return this.getDeliverable(id);
  }

  async deleteDeliverable(id: string): Promise<void> {
    const { error } = await supabase.from('deliverables').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadVersion(input: UploadVersionInput): Promise<DeliverableVersion> {
    const { deliverableId, file, comment } = input;

    // Get current version count
    const { count } = await supabase
      .from('deliverable_versions')
      .select('*', { count: 'exact', head: true })
      .eq('deliverable_id', deliverableId);

    const versionNumber = (count || 0) + 1;

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const filePath = `deliverables/${deliverableId}/${versionNumber}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('deliverable-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('deliverable-files')
      .getPublicUrl(filePath);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Create version record
    const { data: version, error: versionError } = await supabase
      .from('deliverable_versions')
      .insert({
        deliverable_id: deliverableId,
        version_number: versionNumber,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by_id: user.id,
        comment,
      })
      .select(`
        *,
        uploaded_by:users(id, name, avatar_url)
      `)
      .single();

    if (versionError) throw versionError;

    // Update deliverable with new current version and type
    const fileType = mapMimeTypeToDeliverableType(file.type);
    await supabase
      .from('deliverables')
      .update({
        current_version_id: version.id,
        type: fileType,
        thumbnail_url: fileType === 'image' ? publicUrl : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    return this.mapVersionFromDB(version);
  }

  async getVersions(deliverableId: string): Promise<DeliverableVersion[]> {
    const { data, error } = await supabase
      .from('deliverable_versions')
      .select(`
        *,
        uploaded_by:users(id, name, avatar_url)
      `)
      .eq('deliverable_id', deliverableId)
      .order('version_number', { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapVersionFromDB);
  }

  async addFeedback(
    deliverableId: string,
    versionId: string,
    content: string,
    position?: { x: number; y: number } | null
  ): Promise<DeliverableFeedback> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('deliverable_feedback')
      .insert({
        deliverable_id: deliverableId,
        version_id: versionId,
        user_id: user.id,
        content,
        position,
      })
      .select(`
        *,
        user:users(id, name, avatar_url, role)
      `)
      .single();

    if (error) throw error;
    return this.mapFeedbackFromDB(data);
  }

  async getFeedback(deliverableId: string, versionId?: string): Promise<DeliverableFeedback[]> {
    let query = supabase
      .from('deliverable_feedback')
      .select(`
        *,
        user:users(id, name, avatar_url, role)
      `)
      .eq('deliverable_id', deliverableId)
      .order('created_at', { ascending: true });

    if (versionId) {
      query = query.eq('version_id', versionId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(this.mapFeedbackFromDB);
  }

  async resolveFeedback(feedbackId: string): Promise<DeliverableFeedback> {
    const { data, error } = await supabase
      .from('deliverable_feedback')
      .update({ status: 'resolved', updated_at: new Date().toISOString() })
      .eq('id', feedbackId)
      .select(`
        *,
        user:users(id, name, avatar_url, role)
      `)
      .single();

    if (error) throw error;
    return this.mapFeedbackFromDB(data);
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      dueDate: 'due_date',
      status: 'status',
    };
    return fieldMap[field] || 'created_at';
  }

  private mapDeliverableFromDB(data: Record<string, unknown>): Deliverable {
    return {
      id: data.id as string,
      projectId: data.project_id as string,
      name: data.name as string,
      description: data.description as string | null,
      type: data.type as Deliverable['type'],
      status: data.status as Deliverable['status'],
      currentVersionId: data.current_version_id as string | null,
      currentVersion: data.current_version ? this.mapVersionFromDB(data.current_version as Record<string, unknown>) : null,
      versionsCount: (data.versions_count as number) || 0,
      feedbackCount: (data.feedback_count as number) || 0,
      miroFrameId: data.miro_frame_id as string | null,
      miroUrl: data.miro_url as string | null,
      externalUrl: data.external_url as string | null,
      thumbnailUrl: data.thumbnail_url as string | null,
      count: (data.count as number) || 1,
      bonusCount: (data.bonus_count as number | undefined) || 0,
      hoursSpent: data.hours_spent as number | null,
      notes: data.notes as string | null,
      dueDate: data.due_date as string | null,
      deliveredAt: data.delivered_at as string | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }

  private mapVersionFromDB(data: Record<string, unknown>): DeliverableVersion {
    return {
      id: data.id as string,
      deliverableId: data.deliverable_id as string,
      versionNumber: data.version_number as number,
      fileUrl: data.file_url as string,
      fileName: data.file_name as string,
      fileSize: data.file_size as number,
      mimeType: data.mime_type as string,
      uploadedBy: {
        id: (data.uploaded_by as Record<string, unknown>).id as string,
        name: (data.uploaded_by as Record<string, unknown>).name as string,
        avatarUrl: (data.uploaded_by as Record<string, unknown>).avatar_url as string | null,
      },
      comment: data.comment as string | null,
      createdAt: data.created_at as string,
    };
  }

  private mapFeedbackFromDB(data: Record<string, unknown>): DeliverableFeedback {
    return {
      id: data.id as string,
      deliverableId: data.deliverable_id as string,
      versionId: data.version_id as string,
      userId: data.user_id as string,
      user: {
        id: (data.user as Record<string, unknown>).id as string,
        name: (data.user as Record<string, unknown>).name as string,
        avatarUrl: (data.user as Record<string, unknown>).avatar_url as string | null,
        role: (data.user as Record<string, unknown>).role as string,
      },
      content: data.content as string,
      status: data.status as 'pending' | 'resolved',
      miroAnnotationId: data.miro_annotation_id as string | null,
      position: data.position as { x: number; y: number } | null,
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    };
  }
}

export const deliverableService = new DeliverableService();
