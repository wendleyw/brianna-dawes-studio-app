// Supabase Edge Function: sync-worker
//
// Purpose (foundation): claim and run one durable sync job from `public.sync_jobs`.
// This is intentionally minimal and safe to deploy behind a feature flag.
//
// NOTE: Real Miro sync logic should live in dedicated modules and be idempotent.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

type SyncJob = {
  id: string;
  job_type: 'project_sync' | 'master_board_sync';
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  project_id: string | null;
  board_id: string | null;
  payload: Record<string, unknown>;
  attempt_count: number;
  max_attempts: number;
};

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
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'missing_env' }, { status: 500, headers: corsHeaders() });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const workerId = crypto.randomUUID();

  // Claim one job (SKIP LOCKED) via RPC
  const { data: job, error: claimError } = await supabase.rpc('claim_next_sync_job', {
    p_worker_id: workerId,
  });

  if (claimError) {
    return json({ error: 'claim_failed', details: claimError.message }, { status: 500, headers: corsHeaders() });
  }

  if (!job) {
    return json({ ok: true, claimed: false }, { status: 200, headers: corsHeaders() });
  }

  const typedJob = job as SyncJob;

  // Placeholder: real sync implementation lives here.
  // For now, mark failed with explicit "not implemented" so we can safely deploy wiring.
  const notImplementedError = `sync-worker: job ${typedJob.job_type} not implemented`;

  await supabase.rpc('complete_sync_job', {
    p_job_id: typedJob.id,
    p_success: false,
    p_error: notImplementedError,
  });

  return json(
    {
      ok: true,
      claimed: true,
      job: { id: typedJob.id, type: typedJob.job_type, projectId: typedJob.project_id, boardId: typedJob.board_id },
      result: 'failed_not_implemented',
    },
    { status: 200, headers: corsHeaders() }
  );
});

