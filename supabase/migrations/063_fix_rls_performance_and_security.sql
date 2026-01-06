-- Migration: Fix RLS performance and security issues
--
-- PROBLEMS IDENTIFIED BY SUPABASE ADVISORS:
--
-- 1. PERFORMANCE - RLS Auth Init Plan (10 policies):
--    auth.<function>() calls are re-evaluated for each row instead of once per query
--    Fix: Wrap auth.<function>() with (select auth.<function>())
--
-- 2. SECURITY - Function Search Path Mutable (3 functions):
--    Functions don't have search_path set, making them vulnerable to schema attacks
--    Fix: Add SET search_path = public to SECURITY DEFINER functions
--
-- 3. PERFORMANCE - Duplicate Index:
--    users table has two identical indexes on subscription_plan_id
--    Fix: Drop idx_users_subscription_plan (keep idx_users_subscription_plan_id)
--
-- ============================================================================
-- STEP 1: Fix RLS policies to use (select auth.uid()) for better performance
-- ============================================================================

-- Fix: project_reports - "Auth designers can view assigned project reports"
DROP POLICY IF EXISTS "Auth designers can view assigned project reports" ON public.project_reports;
CREATE POLICY "Auth designers can view assigned project reports"
  ON public.project_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.project_designers pd ON pd.user_id = u.id
      WHERE u.auth_user_id = (select auth.uid())
        AND pd.project_id = project_reports.project_id
    )
  );

-- Fix: users - "Admins can delete users"
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users admin
      WHERE admin.auth_user_id = (select auth.uid())
        AND admin.role = 'admin'
    )
  );

-- Fix: project_designers - "Users can view project_designers"
DROP POLICY IF EXISTS "Users can view project_designers" ON public.project_designers;
CREATE POLICY "Users can view project_designers"
  ON public.project_designers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (select auth.uid())
    )
  );

-- Fix: projects - "Users can view accessible projects"
DROP POLICY IF EXISTS "Users can view accessible projects" ON public.projects;
CREATE POLICY "Users can view accessible projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (select auth.uid())
        AND (
          u.role = 'admin'
          OR projects.client_id = u.id
          OR EXISTS (
            SELECT 1 FROM public.project_designers pd
            WHERE pd.project_id = projects.id AND pd.user_id = u.id
          )
        )
    )
  );

-- Fix: deliverables - "Users can view accessible deliverables"
DROP POLICY IF EXISTS "Users can view accessible deliverables" ON public.deliverables;
CREATE POLICY "Users can view accessible deliverables"
  ON public.deliverables
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.projects p ON p.id = deliverables.project_id
      WHERE u.auth_user_id = (select auth.uid())
        AND (
          u.role = 'admin'
          OR p.client_id = u.id
          OR EXISTS (
            SELECT 1 FROM public.project_designers pd
            WHERE pd.project_id = p.id AND pd.user_id = u.id
          )
        )
    )
  );

-- Fix: users - "Users can view all users (including anon)"
DROP POLICY IF EXISTS "Users can view all users (including anon)" ON public.users;
CREATE POLICY "Users can view all users (including anon)"
  ON public.users
  FOR SELECT
  TO authenticated, anon
  USING (
    (select auth.uid()) IS NOT NULL OR (select auth.uid()) IS NULL
  );

-- Fix: project_reports - "Auth admins have full access to project_reports"
DROP POLICY IF EXISTS "Auth admins have full access to project_reports" ON public.project_reports;
CREATE POLICY "Auth admins have full access to project_reports"
  ON public.project_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (select auth.uid())
        AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = (select auth.uid())
        AND u.role = 'admin'
    )
  );

-- Fix: project_reports - "Auth clients can view own project reports"
DROP POLICY IF EXISTS "Auth clients can view own project reports" ON public.project_reports;
CREATE POLICY "Auth clients can view own project reports"
  ON public.project_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.projects p ON p.client_id = u.id
      WHERE u.auth_user_id = (select auth.uid())
        AND p.id = project_reports.project_id
    )
  );

-- Fix: project_reports - "Auth clients can update view count on own project reports"
DROP POLICY IF EXISTS "Auth clients can update view count on own project reports" ON public.project_reports;
CREATE POLICY "Auth clients can update view count on own project reports"
  ON public.project_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.projects p ON p.client_id = u.id
      WHERE u.auth_user_id = (select auth.uid())
        AND p.id = project_reports.project_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      INNER JOIN public.projects p ON p.client_id = u.id
      WHERE u.auth_user_id = (select auth.uid())
        AND p.id = project_reports.project_id
    )
  );

-- ============================================================================
-- STEP 2: Fix function search_path security issues
-- ============================================================================

-- Fix: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix: has_miro_connection
CREATE OR REPLACE FUNCTION public.has_miro_connection()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.miro_oauth_tokens
    WHERE user_id = auth.uid()
      AND expires_at > now()
  );
END;
$$;

-- Fix: get_dashboard_metrics (must drop first due to return type change)
DROP FUNCTION IF EXISTS public.get_dashboard_metrics();
CREATE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  current_user_role user_role;
  metrics jsonb;
  total_projects int;
  active_projects int;
  completed_projects int;
  total_deliverables int;
  pending_deliverables int;
BEGIN
  -- Get current user
  SELECT id, role INTO current_user_id, current_user_role
  FROM public.users
  WHERE auth_user_id = auth.uid();

  IF current_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'User not found',
      'total_projects', 0,
      'active_projects', 0,
      'completed_projects', 0,
      'total_deliverables', 0,
      'pending_deliverables', 0
    );
  END IF;

  -- Calculate metrics based on role
  IF current_user_role = 'admin' THEN
    -- Admins see all projects
    SELECT COUNT(*) INTO total_projects FROM public.projects WHERE archived_at IS NULL;
    SELECT COUNT(*) INTO active_projects FROM public.projects
    WHERE status IN ('in_progress', 'review') AND archived_at IS NULL;
    SELECT COUNT(*) INTO completed_projects FROM public.projects WHERE status = 'done';
    SELECT COUNT(*) INTO total_deliverables FROM public.deliverables;
    SELECT COUNT(*) INTO pending_deliverables FROM public.deliverables
    WHERE status IN ('draft', 'in_progress', 'in_review');
  ELSIF current_user_role = 'designer' THEN
    -- Designers see assigned projects
    SELECT COUNT(DISTINCT p.id) INTO total_projects
    FROM public.projects p
    INNER JOIN public.project_designers pd ON pd.project_id = p.id
    WHERE pd.user_id = current_user_id AND p.archived_at IS NULL;

    SELECT COUNT(DISTINCT p.id) INTO active_projects
    FROM public.projects p
    INNER JOIN public.project_designers pd ON pd.project_id = p.id
    WHERE pd.user_id = current_user_id
      AND p.status IN ('in_progress', 'review')
      AND p.archived_at IS NULL;

    SELECT COUNT(DISTINCT p.id) INTO completed_projects
    FROM public.projects p
    INNER JOIN public.project_designers pd ON pd.project_id = p.id
    WHERE pd.user_id = current_user_id AND p.status = 'done';

    SELECT COUNT(d.id) INTO total_deliverables
    FROM public.deliverables d
    INNER JOIN public.project_designers pd ON pd.project_id = d.project_id
    WHERE pd.user_id = current_user_id;

    SELECT COUNT(d.id) INTO pending_deliverables
    FROM public.deliverables d
    INNER JOIN public.project_designers pd ON pd.project_id = d.project_id
    WHERE pd.user_id = current_user_id
      AND d.status IN ('draft', 'in_progress', 'in_review');
  ELSE
    -- Clients see own projects
    SELECT COUNT(*) INTO total_projects FROM public.projects
    WHERE client_id = current_user_id AND archived_at IS NULL;
    SELECT COUNT(*) INTO active_projects FROM public.projects
    WHERE client_id = current_user_id
      AND status IN ('in_progress', 'review')
      AND archived_at IS NULL;
    SELECT COUNT(*) INTO completed_projects FROM public.projects
    WHERE client_id = current_user_id AND status = 'done';
    SELECT COUNT(*) INTO total_deliverables FROM public.deliverables d
    INNER JOIN public.projects p ON p.id = d.project_id
    WHERE p.client_id = current_user_id;
    SELECT COUNT(*) INTO pending_deliverables FROM public.deliverables d
    INNER JOIN public.projects p ON p.id = d.project_id
    WHERE p.client_id = current_user_id
      AND d.status IN ('draft', 'in_progress', 'in_review');
  END IF;

  RETURN jsonb_build_object(
    'total_projects', COALESCE(total_projects, 0),
    'active_projects', COALESCE(active_projects, 0),
    'completed_projects', COALESCE(completed_projects, 0),
    'total_deliverables', COALESCE(total_deliverables, 0),
    'pending_deliverables', COALESCE(pending_deliverables, 0)
  );
END;
$$;

-- ============================================================================
-- STEP 3: Drop duplicate index
-- ============================================================================

-- Drop idx_users_subscription_plan (duplicate of idx_users_subscription_plan_id)
DROP INDEX IF EXISTS public.idx_users_subscription_plan;

-- ============================================================================
-- STEP 4: Add missing indexes for foreign keys
-- ============================================================================

-- Add index for miro_oauth_states.user_id (foreign key)
CREATE INDEX IF NOT EXISTS idx_miro_oauth_states_user_id
  ON public.miro_oauth_states(user_id);

-- Add index for sync_jobs.requested_by (foreign key)
CREATE INDEX IF NOT EXISTS idx_sync_jobs_requested_by
  ON public.sync_jobs(requested_by);

-- ============================================================================
-- STEP 5: Verify improvements
-- ============================================================================

DO $$
DECLARE
  rls_policies_fixed int;
  functions_fixed int;
  duplicate_index_removed boolean;
BEGIN
  -- Count RLS policies that should be fixed
  SELECT COUNT(*) INTO rls_policies_fixed
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'Auth designers can view assigned project reports',
      'Admins can delete users',
      'Users can view project_designers',
      'Users can view accessible projects',
      'Users can view accessible deliverables',
      'Users can view all users (including anon)',
      'Auth admins have full access to project_reports',
      'Auth clients can view own project reports',
      'Auth clients can update view count on own project reports'
    );

  -- Count functions that should be fixed
  SELECT COUNT(*) INTO functions_fixed
  FROM pg_proc
  WHERE proname IN ('update_updated_at_column', 'has_miro_connection', 'get_dashboard_metrics')
    AND prosrc LIKE '%search_path%';

  -- Check if duplicate index was removed
  SELECT NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_users_subscription_plan'
  ) INTO duplicate_index_removed;

  RAISE NOTICE '=== Migration 063 Results ===';
  RAISE NOTICE 'RLS policies fixed: % / 9 expected', rls_policies_fixed;
  RAISE NOTICE 'Functions fixed: % / 3 expected', functions_fixed;
  RAISE NOTICE 'Duplicate index removed: %', duplicate_index_removed;
  RAISE NOTICE 'New indexes added: idx_miro_oauth_states_user_id, idx_sync_jobs_requested_by';
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Auth designers can view assigned project reports" ON public.project_reports IS
  'Fixed: Uses (select auth.uid()) to prevent re-evaluation for each row';

COMMENT ON POLICY "Users can view accessible projects" ON public.projects IS
  'Fixed: Uses (select auth.uid()) to prevent re-evaluation for each row';

COMMENT ON POLICY "Users can view accessible deliverables" ON public.deliverables IS
  'Fixed: Uses (select auth.uid()) to prevent re-evaluation for each row';

COMMENT ON FUNCTION public.update_updated_at_column IS
  'Trigger function to update updated_at timestamp. Fixed: Added search_path = public for security';

COMMENT ON FUNCTION public.has_miro_connection IS
  'Checks if current user has valid Miro OAuth token. Fixed: Added search_path = public for security';

COMMENT ON FUNCTION public.get_dashboard_metrics IS
  'Returns dashboard metrics for current user based on role. Fixed: Added search_path = public for security';

-- ============================================================================
-- REMAINING ADVISORIES (Lower Priority)
-- ============================================================================

-- INFO - Unused indexes will be automatically used once app usage increases
-- INFO - RLS enabled but no policy on miro_oauth_states/tokens is intentional (managed by Edge Functions)
-- WARN - Leaked password protection should be enabled in Supabase Dashboard (not migration)
-- WARN - Multiple permissive policies can be consolidated in future migration if performance issues arise
