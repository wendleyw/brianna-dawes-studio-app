-- Add targeted job-claim RPC for sync-worker/devtools.
--
-- Problem:
-- `sync-worker` can only claim the next queued job globally. For E2E/admin tooling,
-- this can accidentally process unrelated queued jobs (side effects on real projects).
--
-- Fix:
-- Add `claim_sync_job_by_id(p_job_id, p_worker_id)` (service_role only) so callers
-- can run a specific job deterministically.

begin;

create or replace function public.claim_sync_job_by_id(
  p_job_id uuid,
  p_worker_id text
)
returns public.sync_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.sync_jobs;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not authorized' using errcode = 'P0001';
  end if;

  select *
  into v_job
  from public.sync_jobs
  where id = p_job_id
    and status = 'queued'
    and run_at <= now()
    and attempt_count < max_attempts
  for update skip locked;

  if v_job.id is null then
    return null;
  end if;

  update public.sync_jobs
  set status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = attempt_count + 1,
      last_error = null
  where id = v_job.id
  returning * into v_job;

  return v_job;
end;
$$;

revoke execute on function public.claim_sync_job_by_id(uuid, text) from public;
grant execute on function public.claim_sync_job_by_id(uuid, text) to service_role;

commit;
