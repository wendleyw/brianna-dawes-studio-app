// Supabase Edge Function: projects-update
//
// Server-side boundary for updating projects (admin-only).
// Calls transactional RPC `update_project_with_designers`.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

type UpdateProjectPayload = {
  projectId: string;
  updateDesigners?: boolean;
  name?: string | null;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  clientId?: string | null;
  miroBoardId?: string | null;
  miroBoardUrl?: string | null;
  briefing?: Record<string, unknown> | null;
  googleDriveUrl?: string | null;
  wasReviewed?: boolean | null;
  wasApproved?: boolean | null;
  requestedDueDate?: string | null;
  dueDateRequestedAt?: string | null;
  dueDateRequestedBy?: string | null;
  dueDateApproved?: boolean | null;
  thumbnailUrl?: string | null;
  designerIds?: string[] | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, { status: 405, headers: corsHeaders() });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: 'missing_env' }, { status: 500, headers: corsHeaders() });
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'missing_authorization' }, { status: 401, headers: corsHeaders() });
  }

  let payload: UpdateProjectPayload;
  try {
    payload = (await req.json()) as UpdateProjectPayload;
  } catch {
    return json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders() });
  }

  if (!payload?.projectId) {
    return json({ error: 'missing_required_fields', fields: ['projectId'] }, { status: 400, headers: corsHeaders() });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) {
    return json({ error: 'invalid_token', details: authError?.message }, { status: 401, headers: corsHeaders() });
  }

  const authUserId = authData.user.id;

  const { data: publicUser } = await userClient
    .from('users')
    .select('id, role')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (!publicUser || publicUser.role !== 'admin') {
    return json({ error: 'forbidden' }, { status: 403, headers: corsHeaders() });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: rpcError } = await adminClient.rpc('update_project_with_designers', {
    p_project_id: payload.projectId,
    p_update_designers: payload.updateDesigners ?? (payload.designerIds !== undefined),
    p_name: payload.name ?? null,
    p_description: payload.description ?? null,
    p_status: payload.status ?? null,
    p_priority: payload.priority ?? null,
    p_start_date: payload.startDate ?? null,
    p_due_date: payload.dueDate ?? null,
    p_client_id: payload.clientId ?? null,
    p_miro_board_id: payload.miroBoardId ?? null,
    p_miro_board_url: payload.miroBoardUrl ?? null,
    p_briefing: payload.briefing ?? null,
    p_google_drive_url: payload.googleDriveUrl ?? null,
    p_was_reviewed: payload.wasReviewed ?? null,
    p_was_approved: payload.wasApproved ?? null,
    p_requested_due_date: payload.requestedDueDate ?? null,
    p_due_date_requested_at: payload.dueDateRequestedAt ?? null,
    p_due_date_requested_by: payload.dueDateRequestedBy ?? null,
    p_due_date_approved: payload.dueDateApproved ?? null,
    p_thumbnail_url: payload.thumbnailUrl ?? null,
    p_designer_ids: payload.designerIds ?? null,
  });

  if (rpcError) {
    return json({ error: 'rpc_failed', details: rpcError.message }, { status: 500, headers: corsHeaders() });
  }

  return json({ ok: true }, { status: 200, headers: corsHeaders() });
});

