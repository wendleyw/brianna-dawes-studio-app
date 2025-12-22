import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { storeMiroTokens } from '../_shared/miroTokens.ts';

const MIRO_TOKEN_URL = 'https://api.miro.com/v1/oauth/token';

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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const miroClientId = Deno.env.get('MIRO_CLIENT_ID') ?? '';
  const miroClientSecret = Deno.env.get('MIRO_CLIENT_SECRET') ?? '';
  const miroRedirectUri = Deno.env.get('MIRO_REDIRECT_URI') ?? '';
  const encryptionKey = Deno.env.get('MIRO_TOKEN_ENCRYPTION_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey || !miroClientId || !miroClientSecret || !miroRedirectUri || !encryptionKey) {
    return json({ error: 'missing_env' }, { status: 500, headers: corsHeaders() });
  }

  let payload: { code?: string; state?: string } = {};
  try {
    payload = (await req.json()) as { code?: string; state?: string };
  } catch {
    return json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders() });
  }

  if (!payload.code || !payload.state) {
    return json({ error: 'missing_code_or_state' }, { status: 400, headers: corsHeaders() });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: stateRow, error: stateError } = await adminClient
    .from('miro_oauth_states')
    .select('state, user_id, board_id, expires_at, used_at')
    .eq('state', payload.state)
    .maybeSingle();

  if (stateError || !stateRow) {
    return json({ error: 'invalid_state' }, { status: 400, headers: corsHeaders() });
  }

  if (stateRow.used_at) {
    return json({ error: 'state_already_used' }, { status: 400, headers: corsHeaders() });
  }

  const expiresAt = new Date(stateRow.expires_at as string).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) {
    return json({ error: 'state_expired' }, { status: 400, headers: corsHeaders() });
  }

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: payload.code,
    redirect_uri: miroRedirectUri,
    client_id: miroClientId,
    client_secret: miroClientSecret,
  });

  const res = await fetch(MIRO_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    return json({ error: 'token_exchange_failed', details: text.slice(0, 300) }, { status: 400, headers: corsHeaders() });
  }

  const tokenPayload = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
    user_id?: string;
    team_id?: string;
  };

  if (!tokenPayload.access_token) {
    return json({ error: 'missing_access_token' }, { status: 400, headers: corsHeaders() });
  }

  await storeMiroTokens(
    adminClient,
    {
      userId: stateRow.user_id ?? null,
      boardId: stateRow.board_id ?? null,
      miroUserId: tokenPayload.user_id ?? null,
      teamId: tokenPayload.team_id ?? null,
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token ?? null,
      tokenType: tokenPayload.token_type ?? null,
      scope: tokenPayload.scope ?? null,
      expiresIn: tokenPayload.expires_in ?? null,
    },
    encryptionKey
  );

  await adminClient.from('miro_oauth_states').update({ used_at: new Date().toISOString() }).eq('state', payload.state);

  return json(
    {
      ok: true,
      boardId: stateRow.board_id ?? null,
    },
    { status: 200, headers: corsHeaders() }
  );
});
