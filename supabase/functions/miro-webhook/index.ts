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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

async function verifySignature(secret: string, body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const macBytes = new Uint8Array(mac);
  const hex = bytesToHex(macBytes);
  const base64 = bytesToBase64(macBytes);
  const normalized = signature.replace(/^sha256=/, '').trim();
  return normalized === hex || normalized === base64;
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
  const webhookSecret = Deno.env.get('MIRO_WEBHOOK_SECRET') ?? '';

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return json({ error: 'missing_env' }, { status: 500, headers: corsHeaders() });
  }

  const bodyText = await req.text();
  const signatureHeader =
    req.headers.get('x-miro-signature') ||
    req.headers.get('X-Miro-Signature') ||
    req.headers.get('x-hub-signature-256') ||
    req.headers.get('X-Hub-Signature-256');

  const validSignature = await verifySignature(webhookSecret, bodyText, signatureHeader);
  if (!validSignature) {
    return json({ error: 'invalid_signature' }, { status: 401, headers: corsHeaders() });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = bodyText ? (JSON.parse(bodyText) as Record<string, unknown>) : {};
  } catch {
    return json({ error: 'invalid_json' }, { status: 400, headers: corsHeaders() });
  }

  if (typeof payload.challenge === 'string') {
    return json({ challenge: payload.challenge }, { status: 200, headers: corsHeaders() });
  }

  const boardId = (payload.board_id || payload.boardId) as string | undefined;
  if (!boardId) {
    return json({ error: 'missing_board_id' }, { status: 400, headers: corsHeaders() });
  }

  const eventType = (payload.event || payload.type || payload.event_type || payload.eventType) as string | undefined;
  const item = (payload.item || (payload.data as Record<string, unknown> | undefined)?.item) as Record<string, unknown> | undefined;
  const itemId = (item?.id || payload.item_id || payload.itemId) as string | undefined;
  const itemType = (item?.type || payload.item_type || payload.itemType) as string | undefined;
  const eventAt = (payload.event_time || payload.eventTime || payload.created_at || new Date().toISOString()) as string;

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await adminClient.from('sync_jobs').insert({
    job_type: 'miro_item_sync',
    status: 'queued',
    board_id: boardId,
    payload: {
      eventType: eventType ?? null,
      boardId,
      itemId: itemId ?? null,
      itemType: itemType ?? null,
      eventAt,
      raw: payload,
    },
    run_at: new Date().toISOString(),
  });

  if (error) {
    return json({ error: 'enqueue_failed', details: error.message }, { status: 500, headers: corsHeaders() });
  }

  return json({ ok: true }, { status: 200, headers: corsHeaders() });
});
