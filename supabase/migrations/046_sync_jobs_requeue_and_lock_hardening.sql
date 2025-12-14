-- Sync jobs: add robust requeue/backoff and lock cleanup.
--
-- Goals:
-- - Ensure locked jobs get unlocked on completion
-- - Support retry with exponential backoff via a single RPC (service_role only)
-- - Requeue stale running jobs (crash recovery) during claim

begin;

-- ---------------------------------------------------------------------------
-- 1) Make claim resilient to stale locks (worker crash recovery)
-- ---------------------------------------------------------------------------

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
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'P0001';
  END IF;

  -- Requeue stale running jobs (no heartbeat today; recover after 10 minutes)
  WITH stale AS (
    SELECT id
    FROM public.sync_jobs
    WHERE status = 'running'
      AND finished_at IS NULL
      AND locked_at IS NOT NULL
      AND locked_at < now() - interval '10 minutes'
      AND attempt_count < max_attempts
    ORDER BY locked_at ASC
    LIMIT 25
  )
  UPDATE public.sync_jobs
  SET status = 'queued',
      locked_at = NULL,
      locked_by = NULL,
      run_at = now(),
      last_error = COALESCE(last_error, 'stale_lock_requeued')
  WHERE id IN (SELECT id FROM stale);

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

-- ---------------------------------------------------------------------------
-- 2) Ensure completion clears locks (avoid forever-running rows)
-- ---------------------------------------------------------------------------

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
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.sync_jobs
  SET status = CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
      finished_at = now(),
      locked_at = NULL,
      locked_by = NULL,
      last_error = p_error
  WHERE id = p_job_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Add retry-aware failure RPC (requeue with delay if attempts remain)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fail_sync_job(
  p_job_id uuid,
  p_error text,
  p_retry_delay_seconds integer DEFAULT 60
)
RETURNS public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.sync_jobs;
  v_delay interval;
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'not authorized' USING ERRCODE = 'P0001';
  END IF;

  v_delay := make_interval(secs => GREATEST(0, COALESCE(p_retry_delay_seconds, 0)));

  SELECT * INTO v_job
  FROM public.sync_jobs
  WHERE id = p_job_id
  FOR UPDATE;

  IF v_job.id IS NULL THEN
    RETURN NULL;
  END IF;

  IF v_job.attempt_count < v_job.max_attempts THEN
    UPDATE public.sync_jobs
    SET status = 'queued',
        run_at = now() + v_delay,
        locked_at = NULL,
        locked_by = NULL,
        last_error = p_error
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    RETURN v_job;
  END IF;

  UPDATE public.sync_jobs
  SET status = 'failed',
      finished_at = now(),
      locked_at = NULL,
      locked_by = NULL,
      last_error = p_error
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fail_sync_job(uuid, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.fail_sync_job(uuid, text, integer) TO service_role;

commit;

