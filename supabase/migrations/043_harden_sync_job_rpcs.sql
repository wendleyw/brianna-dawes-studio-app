-- Harden job-runner RPCs: only service role should be able to claim/complete jobs.
-- Enqueue remains admin-only (interactive operation).

begin;

REVOKE EXECUTE ON FUNCTION public.claim_next_sync_job(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_sync_job(uuid, boolean, text) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.claim_next_sync_job(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_sync_job(uuid, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_next_sync_job(p_worker_id text)
RETURNS public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.sync_jobs;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT *
  INTO v_job
  FROM public.sync_jobs
  WHERE status = 'queued'
    AND run_at <= now()
    AND attempt_count < max_attempts
  ORDER BY run_at ASC, created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.sync_jobs
  SET status = 'running',
      locked_at = now(),
      locked_by = p_worker_id,
      attempt_count = attempt_count + 1,
      last_error = NULL
  WHERE id = v_job.id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sync_job(
  p_job_id uuid,
  p_success boolean,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.sync_jobs
  SET status = CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
      finished_at = now(),
      last_error = p_error
  WHERE id = p_job_id;
END;
$$;

commit;

