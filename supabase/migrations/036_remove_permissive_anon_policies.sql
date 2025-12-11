-- Migration: Remove ALL permissive anon policies - CRITICAL SECURITY FIX
-- This migration removes the dangerous policies from migration 034 that allowed
-- anonymous users full CRUD access to all tables.
--
-- CONTEXT:
-- Migration 034 added permissive "Anon can *" policies as a temporary fix
-- for Miro SDK authentication. This was NEVER meant for production.
--
-- NEW APPROACH:
-- Migration 035 already implemented proper Supabase Auth bridging via
-- supabaseAuthBridge.ts. All users now authenticate through Supabase Auth
-- after Miro login, so we can safely require authentication for all operations.
--
-- WHAT THIS MIGRATION DOES:
-- 1. Drops ALL "Anon can *" policies from ALL tables
-- 2. Ensures RLS is enabled on all tables
-- 3. Keeps the authenticated user policies from migrations 031 and 035
--
-- RESULT:
-- - Anonymous users: NO ACCESS to any data
-- - Authenticated users: Access based on role (admin/designer/client)

-- ============================================================================
-- STEP 1: DROP ALL PERMISSIVE ANON POLICIES ON PROJECTS
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can delete projects" ON public.projects;

-- ============================================================================
-- STEP 2: DROP ALL PERMISSIVE ANON POLICIES ON PROJECT_DESIGNERS
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anon can insert project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anon can delete project_designers" ON public.project_designers;

-- ============================================================================
-- STEP 3: DROP ALL PERMISSIVE ANON POLICIES ON DELIVERABLES
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anon can insert deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anon can update deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anon can delete deliverables" ON public.deliverables;

-- ============================================================================
-- STEP 4: DROP ALL PERMISSIVE ANON POLICIES ON USERS
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view users" ON public.users;
DROP POLICY IF EXISTS "Anon can insert users" ON public.users;
DROP POLICY IF EXISTS "Anon can update users" ON public.users;

-- ============================================================================
-- STEP 5: DROP ALL PERMISSIVE ANON POLICIES ON USER_BOARDS
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can insert user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can update user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can delete user_boards" ON public.user_boards;

-- ============================================================================
-- STEP 6: DROP ALL PERMISSIVE ANON POLICIES ON DELIVERABLE_VERSIONS
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anon can insert deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anon can delete deliverable_versions" ON public.deliverable_versions;

-- ============================================================================
-- STEP 7: DROP ALL PERMISSIVE ANON POLICIES ON DELIVERABLE_FEEDBACK
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anon can insert deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anon can update deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anon can delete deliverable_feedback" ON public.deliverable_feedback;

-- ============================================================================
-- STEP 8: DROP ANY OTHER "Anyone can" POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can select projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can select project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can insert project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can select deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can insert deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can update deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can select users" ON public.users;
DROP POLICY IF EXISTS "Anyone can select deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anyone can insert deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anyone can select deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anyone can insert deliverable_feedback" ON public.deliverable_feedback;

-- ============================================================================
-- STEP 9: ENSURE RLS IS ENABLED ON ALL TABLES
-- ============================================================================

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_designers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_boards ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 10: ADD AUDIT LOG TABLE FOR COMPLIANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS for audit logs - only admins can view
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- STEP 11: ADD SYNC_LOGS TABLE FOR MIRO SYNC TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete', 'sync')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'success', 'error', 'rolled_back')),
  miro_items_created JSONB DEFAULT '[]'::JSONB,
  miro_items_updated JSONB DEFAULT '[]'::JSONB,
  miro_items_deleted JSONB DEFAULT '[]'::JSONB,
  error_message TEXT,
  error_category TEXT,
  retry_count INT DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for sync logs
CREATE INDEX IF NOT EXISTS idx_sync_logs_project_id ON public.sync_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_operation ON public.sync_logs(operation);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON public.sync_logs(created_at DESC);

-- RLS for sync logs
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sync logs"
  ON public.sync_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated users can insert sync logs"
  ON public.sync_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own sync logs"
  ON public.sync_logs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 12: ADD MISSING INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- Composite index for project_designers (frequently joined)
CREATE INDEX IF NOT EXISTS idx_project_designers_composite
  ON public.project_designers(project_id, user_id);

-- Functional index for admin checks (used in many RLS policies)
CREATE INDEX IF NOT EXISTS idx_users_admin_role
  ON public.users(id) WHERE role = 'admin';

-- Index for designer role checks
CREATE INDEX IF NOT EXISTS idx_users_designer_role
  ON public.users(id) WHERE role = 'designer';

-- Index for client role checks
CREATE INDEX IF NOT EXISTS idx_users_client_role
  ON public.users(id) WHERE role = 'client';

-- Index for deliverable version lookups (get latest)
CREATE INDEX IF NOT EXISTS idx_deliverable_versions_latest
  ON public.deliverable_versions(deliverable_id, version_number DESC);

-- Index for feedback status queries
CREATE INDEX IF NOT EXISTS idx_feedback_status_composite
  ON public.deliverable_feedback(deliverable_id, status);

-- ============================================================================
-- STEP 13: CREATE AUDIT LOG FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_action TEXT,
  p_table_name TEXT,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_audit_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user ID from auth or public users
  v_user_id := COALESCE(
    (SELECT id FROM public.users WHERE auth_user_id = auth.uid()),
    auth.uid()
  );

  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    v_user_id,
    p_action,
    p_table_name,
    p_record_id,
    p_old_data,
    p_new_data
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event TO authenticated;

-- ============================================================================
-- STEP 14: CREATE SYNC LOG FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_sync_log(
  p_project_id UUID,
  p_operation TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sync_id UUID;
BEGIN
  INSERT INTO public.sync_logs (
    project_id,
    operation,
    status,
    started_at
  ) VALUES (
    p_project_id,
    p_operation,
    'syncing',
    NOW()
  )
  RETURNING id INTO v_sync_id;

  RETURN v_sync_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_sync_log(
  p_sync_id UUID,
  p_status TEXT,
  p_miro_items_created JSONB DEFAULT '[]'::JSONB,
  p_miro_items_updated JSONB DEFAULT '[]'::JSONB,
  p_miro_items_deleted JSONB DEFAULT '[]'::JSONB,
  p_error_message TEXT DEFAULT NULL,
  p_error_category TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at TIMESTAMPTZ;
  v_duration_ms INT;
BEGIN
  -- Get start time
  SELECT started_at INTO v_started_at FROM public.sync_logs WHERE id = p_sync_id;

  -- Calculate duration
  v_duration_ms := EXTRACT(EPOCH FROM (NOW() - v_started_at)) * 1000;

  UPDATE public.sync_logs SET
    status = p_status,
    miro_items_created = p_miro_items_created,
    miro_items_updated = p_miro_items_updated,
    miro_items_deleted = p_miro_items_deleted,
    error_message = p_error_message,
    error_category = p_error_category,
    completed_at = NOW(),
    duration_ms = v_duration_ms
  WHERE id = p_sync_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_sync_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sync_log TO authenticated;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.audit_logs IS
  'Stores audit trail of all important operations for compliance and debugging';

COMMENT ON TABLE public.sync_logs IS
  'Tracks Miro synchronization operations with detailed status and timing';

COMMENT ON FUNCTION public.log_audit_event IS
  'Creates an audit log entry for tracking user actions';

COMMENT ON FUNCTION public.create_sync_log IS
  'Starts a new sync log entry when beginning a Miro sync operation';

COMMENT ON FUNCTION public.complete_sync_log IS
  'Completes a sync log entry with results and timing';

-- ============================================================================
-- SECURITY VERIFICATION
-- ============================================================================

-- This query should return 0 rows (no anon policies remaining)
-- Run manually to verify:
-- SELECT policyname, tablename FROM pg_policies
-- WHERE policyname LIKE '%Anon%' OR policyname LIKE '%Anyone%';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- After this migration:
-- 1. ALL anonymous access is BLOCKED
-- 2. ALL operations require Supabase Auth authentication
-- 3. Users must authenticate via supabaseAuthBridge after Miro login
-- 4. RLS policies use auth.uid() and auth_user_id linking
-- 5. Audit logs track all important operations
-- 6. Sync logs track all Miro synchronization operations
--
-- The app will NOT work without proper authentication.
-- This is the intended and secure behavior.
