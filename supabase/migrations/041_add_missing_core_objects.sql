-- Add missing tables/columns/RPCs referenced by the app.
-- Goal: make schema match code expectations without destructive changes.

begin;

-- ============================================================================
-- 1) BOARDS (master list) - used by AdminService
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.boards (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to boards" ON public.boards;
CREATE POLICY "Admins have full access to boards"
  ON public.boards
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_boards_updated_at ON public.boards;
CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 2) SUBSCRIPTION PLANS + CLIENT PLAN STATS VIEW - used by AdminService
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  display_name text NOT NULL,
  deliverables_limit integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#999999',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to subscription_plans" ON public.subscription_plans;
CREATE POLICY "Admins have full access to subscription_plans"
  ON public.subscription_plans
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Users table fields referenced by the admin UI (billing/limits)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS subscription_plan_id text REFERENCES public.subscription_plans(id),
  ADD COLUMN IF NOT EXISTS deliverables_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS plan_end_date timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_subscription_plan_id ON public.users(subscription_plan_id);

CREATE OR REPLACE VIEW public.client_plan_stats AS
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u.company_name,
  u.subscription_plan_id AS plan_id,
  sp.name AS plan_name,
  COALESCE(sp.deliverables_limit, 0) AS deliverables_limit,
  sp.color AS plan_color,
  COALESCE(u.deliverables_used, 0) AS deliverables_used,
  CASE
    WHEN COALESCE(sp.deliverables_limit, 0) <= 0 THEN 0
    ELSE LEAST(100, ROUND((COALESCE(u.deliverables_used, 0)::numeric / sp.deliverables_limit::numeric) * 100))
  END AS usage_percentage,
  GREATEST(COALESCE(sp.deliverables_limit, 0) - COALESCE(u.deliverables_used, 0), 0) AS remaining_credits,
  u.plan_start_date,
  u.plan_end_date
FROM public.users u
LEFT JOIN public.subscription_plans sp ON sp.id = u.subscription_plan_id
WHERE u.role = 'client';

GRANT SELECT ON public.client_plan_stats TO authenticated;

-- RPC referenced by the admin UI
CREATE OR REPLACE FUNCTION public.increment_deliverables_used(
  p_user_id uuid,
  p_amount integer DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.users
  SET deliverables_used = COALESCE(deliverables_used, 0) + GREATEST(p_amount, 0),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_deliverables_used(uuid, integer) TO authenticated;

-- ============================================================================
-- 3) FILES (dev tooling expects it; keep minimal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverable_id uuid REFERENCES public.deliverables(id) ON DELETE CASCADE,
  name text,
  url text,
  mime_type text,
  size bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full access to files" ON public.files;
CREATE POLICY "Admins have full access to files"
  ON public.files
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_files_updated_at ON public.files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 4) DELIVERABLES columns referenced by the frontend
-- ============================================================================
ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS miro_url text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS hours_spent numeric,
  ADD COLUMN IF NOT EXISTS notes text;

-- Fix deliverable_versions FK action mismatch (ON DELETE SET NULL requires nullable)
DO $$
BEGIN
  IF to_regclass('public.deliverable_versions') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.deliverable_versions
        ALTER COLUMN uploaded_by_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN
      -- ignore if already nullable or column doesn't exist
    END;
  END IF;
END $$;

-- ============================================================================
-- 5) Bridge trigger: when deliverables.versions (JSONB) grows, upsert into deliverable_versions
--    This keeps legacy (table) + new (JSONB) models consistent and prevents FK failures in feedback.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bridge_versions_jsonb_to_table()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_count int;
  v_new_count int;
  v_latest jsonb;
  v_version_id uuid;
  v_uploaded_by_id uuid;
BEGIN
  v_old_count := COALESCE(jsonb_array_length(OLD.versions), 0);
  v_new_count := COALESCE(jsonb_array_length(NEW.versions), 0);

  IF v_new_count <= v_old_count THEN
    RETURN NEW;
  END IF;

  -- Only process the latest appended version (append-only contract)
  v_latest := NEW.versions->-1;
  v_version_id := (v_latest->>'id')::uuid;

  -- uploaded_by_id may be missing or not a UUID in some environments
  BEGIN
    v_uploaded_by_id := (v_latest->>'uploaded_by_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_uploaded_by_id := NULL;
  END;

  IF to_regclass('public.deliverable_versions') IS NOT NULL THEN
    INSERT INTO public.deliverable_versions (
      id,
      deliverable_id,
      version_number,
      file_url,
      file_name,
      file_size,
      mime_type,
      uploaded_by_id,
      comment,
      created_at
    ) VALUES (
      v_version_id,
      NEW.id,
      COALESCE((v_latest->>'version')::int, v_new_count),
      v_latest->>'file_url',
      v_latest->>'file_name',
      COALESCE((v_latest->>'file_size')::bigint, 0),
      COALESCE(v_latest->>'mime_type', ''),
      v_uploaded_by_id,
      v_latest->>'comment',
      COALESCE((v_latest->>'created_at')::timestamptz, now())
    )
    ON CONFLICT (id) DO NOTHING;

    -- keep current_version_id coherent for views/functions
    UPDATE public.deliverables
    SET current_version_id = v_version_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never break write-path due to bridge
  RAISE WARNING 'bridge_versions_jsonb_to_table failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.deliverable_versions') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trigger_bridge_versions_jsonb_to_table ON public.deliverables;
    CREATE TRIGGER trigger_bridge_versions_jsonb_to_table
      AFTER UPDATE OF versions ON public.deliverables
      FOR EACH ROW
      WHEN (OLD.versions IS DISTINCT FROM NEW.versions)
      EXECUTE FUNCTION public.bridge_versions_jsonb_to_table();
  END IF;
END $$;

commit;
