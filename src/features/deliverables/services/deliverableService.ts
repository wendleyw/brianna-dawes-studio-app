import { supabase } from '@shared/lib/supabase';
import { env } from '@shared/config/env';
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
 * Version stored in the JSONB `versions` column of deliverables table.
 * This replaced the old `deliverable_versions` table (removed in migration 038).
 */
interface VersionJsonb {
  id: string;
  version: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_by_avatar: string | null;
  comment: string | null;
  created_at: string;
}

interface VersionRow {
  id: string;
  deliverable_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_by_id: string | null;
  comment: string | null;
  created_at: string;
  uploaded_by?: { id: string; name: string; avatar_url: string | null } | null;
}

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
      .select('*', { count: 'exact' });

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
      .select('*')
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

    let data: { id: string } | null = null;
    let error: { code?: string; message: string } | null = null;

    {
      const result = await supabase.from('deliverables').insert(insertData).select().single();
      data = result.data as { id: string } | null;
      error = result.error as { code?: string; message: string } | null;
    }

    // Rollout safety: if DB doesn't have newer columns yet, retry with minimal insert.
    if (error?.code === 'PGRST204') {
      const minimalInsertData: Record<string, unknown> = {
        project_id: input.projectId,
        name: input.name,
        description: input.description || null,
        type: dbType,
        status: dbStatus,
        due_date: input.dueDate,
        ...(input.deliveredAt ? { delivered_at: input.deliveredAt } : {}),
      };

      const retry = await supabase.from('deliverables').insert(minimalInsertData).select().single();
      data = retry.data as { id: string } | null;
      error = retry.error as { code?: string; message: string } | null;
    }

    if (error) throw error;
    if (!data) throw new Error('Failed to create deliverable (no data returned)');
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

    let updateError: { code?: string; message: string } | null = null;

    {
      const { error } = await supabase.from('deliverables').update(updateData).eq('id', id);
      updateError = error as { code?: string; message: string } | null;
    }

    // Rollout safety: retry with a reduced payload if some columns are not present yet.
    if (updateError?.code === 'PGRST204') {
      const minimalUpdateData: Record<string, unknown> = {};
      if (input.name !== undefined) minimalUpdateData.name = input.name;
      if (input.description !== undefined) minimalUpdateData.description = input.description;
      if (input.type !== undefined) minimalUpdateData.type = mapDeliverableTypeToDb(input.type);
      if (input.status !== undefined) minimalUpdateData.status = mapDeliverableStatusToDb(input.status);
      if (input.dueDate !== undefined) minimalUpdateData.due_date = input.dueDate;
      if (input.status === 'delivered') minimalUpdateData.delivered_at = new Date().toISOString();
      minimalUpdateData.updated_at = new Date().toISOString();

      const { error } = await supabase.from('deliverables').update(minimalUpdateData).eq('id', id);
      updateError = error as { code?: string; message: string } | null;
    }

    if (updateError) throw updateError;
    return this.getDeliverable(id);
  }

  async deleteDeliverable(id: string): Promise<void> {
    const { error } = await supabase.from('deliverables').delete().eq('id', id);
    if (error) throw error;
  }

  async uploadVersion(input: UploadVersionInput): Promise<DeliverableVersion> {
    const { deliverableId, file, comment } = input;

    // Get current user (auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Resolve public user record (for FK + display)
    const { data: userDetails } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    const uploadedByPublicUserId = (userDetails?.id as string | undefined) ?? null;
    const uploadedByName = (userDetails?.name as string | undefined) ?? user.email ?? 'Unknown';
    const uploadedByAvatar = (userDetails?.avatar_url as string | null | undefined) ?? null;

    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const filePath = `deliverables/${deliverableId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('deliverable-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('deliverable-files')
      .getPublicUrl(filePath);

    const fileType = mapMimeTypeToDeliverableType(file.type);

    // Preferred path (D-01): write versions to relational table
    if (env.app.useDeliverableVersionsTable) {
      const { data: latestVersion, error: latestError } = await supabase
        .from('deliverable_versions')
        .select('version_number')
        .eq('deliverable_id', deliverableId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError && latestError.code !== '42P01') {
        throw latestError;
      }

      const nextVersionNumber = (latestVersion?.version_number as number | undefined ?? 0) + 1;
      const versionId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      const { error: insertError } = await supabase
        .from('deliverable_versions')
        .insert({
          id: versionId,
          deliverable_id: deliverableId,
          version_number: nextVersionNumber,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by_id: uploadedByPublicUserId,
          comment: comment || null,
          created_at: createdAt,
        });

      // If the table doesn't exist yet, fall back to JSONB path.
      if (insertError?.code !== '42P01' && insertError) {
        throw insertError;
      }

      if (!insertError) {
        // Keep deliverable metadata coherent (type/thumbnail/current_version_id).
        const { error: metaError } = await supabase
          .from('deliverables')
          .update({
            type: fileType,
            thumbnail_url: fileType === 'image' ? publicUrl : null,
            current_version_id: versionId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', deliverableId);

        if (metaError) throw metaError;

        return {
          id: versionId,
          deliverableId,
          versionNumber: nextVersionNumber,
          fileUrl: publicUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadedBy: {
            id: uploadedByPublicUserId ?? user.id,
            name: uploadedByName,
            avatarUrl: uploadedByAvatar,
          },
          comment: comment || null,
          createdAt,
        };
      }
    }

    // Fallback path: append-only JSONB in deliverables.versions (legacy)
    const { data: deliverable, error: fetchError } = await supabase
      .from('deliverables')
      .select('versions')
      .eq('id', deliverableId)
      .single();

    if (fetchError) throw fetchError;

    const currentVersions = (deliverable?.versions as VersionJsonb[] | null) || [];
    const versionNumber = currentVersions.length + 1;

    const newVersion: VersionJsonb = {
      id: crypto.randomUUID(),
      version: versionNumber,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by_id: uploadedByPublicUserId ?? user.id,
      uploaded_by_name: uploadedByName,
      uploaded_by_avatar: uploadedByAvatar,
      comment: comment || null,
      created_at: new Date().toISOString(),
    };

    const updatedVersions = [...currentVersions, newVersion];

    const { error: updateError } = await supabase
      .from('deliverables')
      .update({
        versions: updatedVersions,
        type: fileType,
        thumbnail_url: fileType === 'image' ? publicUrl : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliverableId);

    if (updateError) throw updateError;

    return this.mapVersionFromJsonb(newVersion, deliverableId);
  }

  async getVersions(deliverableId: string): Promise<DeliverableVersion[]> {
    if (env.app.useDeliverableVersionsTable) {
      const { data, error } = await supabase
        .from('deliverable_versions')
        .select('*, uploaded_by:users(id, name, avatar_url)')
        .eq('deliverable_id', deliverableId)
        .order('version_number', { ascending: false });

      if (error) {
        // If table doesn't exist yet, fall back to JSONB path.
        if (error.code !== '42P01') throw error;
      } else {
        return (data as unknown as VersionRow[]).map((row) => ({
          id: row.id,
          deliverableId: row.deliverable_id,
          versionNumber: row.version_number,
          fileUrl: row.file_url,
          fileName: row.file_name,
          fileSize: row.file_size,
          mimeType: row.mime_type,
          uploadedBy: {
            id: row.uploaded_by?.id ?? row.uploaded_by_id ?? '',
            name: row.uploaded_by?.name ?? '',
            avatarUrl: row.uploaded_by?.avatar_url ?? null,
          },
          comment: row.comment,
          createdAt: row.created_at,
        }));
      }
    }

    const { data, error } = await supabase
      .from('deliverables')
      .select('versions')
      .eq('id', deliverableId)
      .single();

    if (error) throw error;

    const versions = (data?.versions as VersionJsonb[] | null) || [];
    // Return versions sorted by version number descending (newest first)
    return versions
      .sort((a, b) => b.version - a.version)
      .map((v) => this.mapVersionFromJsonb(v, deliverableId));
  }

  async addFeedback(
    deliverableId: string,
    versionId: string,
    content: string,
    position?: { x: number; y: number } | null
  ): Promise<DeliverableFeedback> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // IMPORTANT: deliverable_feedback.user_id references public.users(id), not auth.users(id)
    const { data: publicUser, error: publicUserError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (publicUserError) throw publicUserError;
    if (!publicUser?.id) throw new Error('Public user profile not linked to auth user');

    const { data, error } = await supabase
      .from('deliverable_feedback')
      .insert({
        deliverable_id: deliverableId,
        version_id: versionId,
        user_id: publicUser.id,
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
    // Extract versions from JSONB column
    const versions = (data.versions as VersionJsonb[] | null) || [];
    const versionsCount = versions.length;
    // Current version is the last one in the array (highest version number)
    const currentVersionJsonb = versions.length > 0 ? versions[versions.length - 1] : null;
    const deliverableId = data.id as string;

    return {
      id: deliverableId,
      projectId: data.project_id as string,
      name: data.name as string,
      description: data.description as string | null,
      type: data.type as Deliverable['type'],
      status: data.status as Deliverable['status'],
      currentVersionId: currentVersionJsonb?.id || null,
      currentVersion: currentVersionJsonb
        ? this.mapVersionFromJsonb(currentVersionJsonb, deliverableId)
        : null,
      versionsCount,
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

  private mapVersionFromJsonb(data: VersionJsonb, deliverableId: string): DeliverableVersion {
    return {
      id: data.id,
      deliverableId,
      versionNumber: data.version,
      fileUrl: data.file_url,
      fileName: data.file_name,
      fileSize: data.file_size,
      mimeType: data.mime_type,
      uploadedBy: {
        id: data.uploaded_by_id,
        name: data.uploaded_by_name,
        avatarUrl: data.uploaded_by_avatar,
      },
      comment: data.comment,
      createdAt: data.created_at,
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
