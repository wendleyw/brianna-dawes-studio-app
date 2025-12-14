-- Fix enum casting in sync job RPCs.
-- Postgres may infer CASE expressions as text; we must cast to sync_job_status.

begin;

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
  SET status = CASE WHEN p_success
        THEN 'succeeded'::public.sync_job_status
        ELSE 'failed'::public.sync_job_status
      END,
      finished_at = now(),
      locked_at = NULL,
      locked_by = NULL,
      last_error = p_error
  WHERE id = p_job_id;
END;
$$;

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
    SET status = 'queued'::public.sync_job_status,
        run_at = now() + v_delay,
        locked_at = NULL,
        locked_by = NULL,
        last_error = p_error
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    RETURN v_job;
  END IF;

  UPDATE public.sync_jobs
  SET status = 'failed'::public.sync_job_status,
      finished_at = now(),
      locked_at = NULL,
      locked_by = NULL,
      last_error = p_error
  WHERE id = p_job_id
  RETURNING * INTO v_job;

  RETURN v_job;
END;
$$;

commit;

