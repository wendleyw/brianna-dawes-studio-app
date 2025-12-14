// Supabase Edge Function: projects-create
//
// Server-side boundary for creating projects (admin-only).
// Uses:
// - User token (Authorization header) to identify caller
// - Service role to perform DB write (bypasses RLS), while enforcing RBAC manually

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

type CreateProjectPayload = {
  name: string;
  clientId: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  miroBoardId?: string | null;
  miroBoardUrl?: string | null;
  briefing?: Record<string, unknown> | null;
  googleDriveUrl?: string | null;
  dueDateApproved?: boolean | null;
  syncStatus?: string | null;
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

  let payload: CreateProjectPayload;
  try {
    payload = (await req.json()) as CreateProjectPayload;
  } catch {
    return json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders() });
  }

  if (!payload?.name || !payload?.clientId) {
    return json({ error: 'missing_required_fields', fields: ['name', 'clientId'] }, { status: 400, headers: corsHeaders() });
  }

  // Auth client (user-bound)
  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) {
    return json({ error: 'invalid_token', details: authError?.message }, { status: 401, headers: corsHeaders() });
  }

  const authUserId = authData.user.id;

  // Resolve public user + RBAC
  const { data: publicUser, error: publicUserError } = await userClient
    .from('users')
    .select('id, role, is_super_admin')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (publicUserError || !publicUser) {
    return json({ error: 'public_user_not_found' }, { status: 403, headers: corsHeaders() });
  }

  if (publicUser.role !== 'admin') {
    return json({ error: 'forbidden' }, { status: 403, headers: corsHeaders() });
  }

  // Admin client (service role)
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const syncStatus = payload.syncStatus ?? (payload.miroBoardId ? null : 'not_required');

  const { data: projectId, error: rpcError } = await adminClient.rpc('create_project_with_designers', {
    p_name: payload.name,
    p_client_id: payload.clientId,
    p_description: payload.description ?? null,
    p_status: payload.status ?? 'in_progress',
    p_priority: payload.priority ?? 'medium',
    p_start_date: payload.startDate ?? null,
    p_due_date: payload.dueDate ?? null,
    p_miro_board_id: payload.miroBoardId ?? null,
    p_miro_board_url: payload.miroBoardUrl ?? null,
    p_briefing: payload.briefing ?? {},
    p_google_drive_url: payload.googleDriveUrl ?? null,
    p_due_date_approved: payload.dueDateApproved ?? true,
    p_sync_status: syncStatus,
    p_designer_ids: payload.designerIds ?? [],
  });

  if (rpcError) {
    return json({ error: 'rpc_failed', details: rpcError.message }, { status: 500, headers: corsHeaders() });
  }

  return json({ ok: true, projectId }, { status: 200, headers: corsHeaders() });
});

