-- Durable sync job queue (server-driven sync foundation).
-- Additive: does not change existing client-driven sync behavior.

begin;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_job_status') THEN
    CREATE TYPE public.sync_job_status AS ENUM ('queued', 'running', 'succeeded', 'failed', 'canceled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_job_type') THEN
    CREATE TYPE public.sync_job_type AS ENUM ('project_sync', 'master_board_sync');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type public.sync_job_type NOT NULL,
  status public.sync_job_status NOT NULL DEFAULT 'queued',
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  board_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  run_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_run_at ON public.sync_jobs(status, run_at);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_project_id ON public.sync_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_board_id ON public.sync_jobs(board_id);

ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to sync_jobs" ON public.sync_jobs;
CREATE POLICY "Admins have full access to sync_jobs"
  ON public.sync_jobs
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_sync_jobs_updated_at ON public.sync_jobs;
CREATE TRIGGER update_sync_jobs_updated_at
  BEFORE UPDATE ON public.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enqueue a job (admin-only for now; expand later with ABAC).
CREATE OR REPLACE FUNCTION public.enqueue_sync_job(
  p_job_type public.sync_job_type,
  p_project_id uuid DEFAULT NULL,
  p_board_id text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_run_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO public.sync_jobs (job_type, project_id, board_id, payload, requested_by, run_at)
  VALUES (p_job_type, p_project_id, p_board_id, p_payload, auth.uid(), p_run_at)
  RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_sync_job(public.sync_job_type, uuid, text, jsonb, timestamptz) TO authenticated;

-- Claim one queued job (worker-side).
CREATE OR REPLACE FUNCTION public.claim_next_sync_job(p_worker_id text)
RETURNS public.sync_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.sync_jobs;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.claim_next_sync_job(text) TO authenticated;

-- Complete a job.
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
  UPDATE public.sync_jobs
  SET status = CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
      finished_at = now(),
      last_error = p_error
  WHERE id = p_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_sync_job(uuid, boolean, text) TO authenticated;

commit;

