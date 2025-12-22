import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const MIRO_AUTH_URL = 'https://miro.com/oauth/authorize';
const DEFAULT_SCOPES = ['boards:read', 'boards:write', 'offline_access'];

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
  const miroClientId = Deno.env.get('MIRO_CLIENT_ID') ?? '';
  const miroRedirectUri = Deno.env.get('MIRO_REDIRECT_URI') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !miroClientId || !miroRedirectUri) {
    return json({ error: 'missing_env' }, { status: 500, headers: corsHeaders() });
  }

  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader) {
    return json({ error: 'missing_authorization' }, { status: 401, headers: corsHeaders() });
  }

  let payload: { boardId?: string | null; scopes?: string[] | null } = {};
  try {
    payload = (await req.json()) as { boardId?: string | null; scopes?: string[] | null };
  } catch {
    return json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders() });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData?.user) {
    return json({ error: 'invalid_token', details: authError?.message }, { status: 401, headers: corsHeaders() });
  }

  const { data: publicUser, error: publicUserError } = await userClient
    .from('users')
    .select('id, role, primary_board_id')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (publicUserError || !publicUser) {
    return json({ error: 'public_user_not_found' }, { status: 403, headers: corsHeaders() });
  }

  let boardId = payload.boardId ?? publicUser.primary_board_id ?? null;

  if (!boardId) {
    const { data: fallbackBoard } = await userClient
      .from('user_boards')
      .select('board_id')
      .eq('user_id', publicUser.id)
      .eq('is_primary', true)
      .maybeSingle();
    boardId = fallbackBoard?.board_id ?? null;
  }

  if (!boardId) {
    return json({ error: 'missing_board_id' }, { status: 400, headers: corsHeaders() });
  }

  if (publicUser.role !== 'admin') {
    const { data: boardMatch } = await userClient
      .from('user_boards')
      .select('id')
      .eq('user_id', publicUser.id)
      .eq('board_id', boardId)
      .maybeSingle();

    if (!boardMatch) {
      return json({ error: 'board_access_denied' }, { status: 403, headers: corsHeaders() });
    }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const state = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error: stateError } = await adminClient.from('miro_oauth_states').insert({
    state,
    user_id: publicUser.id,
    board_id: boardId,
    expires_at: expiresAt,
  });

  if (stateError) {
    return json({ error: 'state_insert_failed', details: stateError.message }, { status: 500, headers: corsHeaders() });
  }

  const scopes = payload.scopes?.length ? payload.scopes : DEFAULT_SCOPES;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: miroClientId,
    redirect_uri: miroRedirectUri,
    scope: scopes.join(' '),
    state,
  });

  return json(
    {
      ok: true,
      authUrl: `${MIRO_AUTH_URL}?${params.toString()}`,
    },
    { status: 200, headers: corsHeaders() }
  );
});
