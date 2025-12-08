-- Migration: Fix critical security vulnerabilities in RLS policies
-- This migration removes overly permissive policies that allow unauthenticated access
-- and replaces them with proper role-based access control
--
-- CRITICAL FIXES:
-- 1. Remove "Anyone can delete" policies from projects, deliverables, versions, feedback
-- 2. Remove "Anon can update/delete users" policies
-- 3. Add proper admin-only delete policies

-- ============================================================================
-- STEP 1: Drop dangerous policies from migration 014_fix_delete_policies.sql
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can delete project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can delete deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can delete deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anyone can delete deliverable_feedback" ON public.deliverable_feedback;

-- ============================================================================
-- STEP 2: Drop dangerous policies from migration 021_fix_anon_update_users.sql
-- ============================================================================

DROP POLICY IF EXISTS "Anon can update users" ON public.users;
DROP POLICY IF EXISTS "Anon can delete users" ON public.users;

-- ============================================================================
-- STEP 3: Create proper admin-only delete policies for projects
-- ============================================================================

-- Admins can delete projects
CREATE POLICY "Admins can delete projects"
  ON public.projects
  FOR DELETE
  USING (public.is_admin());

-- Admins can delete project_designers
CREATE POLICY "Admins can delete project_designers"
  ON public.project_designers
  FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- STEP 4: Create proper role-based delete policies for deliverables
-- ============================================================================

-- Admins can delete any deliverable
CREATE POLICY "Admins can delete deliverables"
  ON public.deliverables
  FOR DELETE
  USING (public.is_admin());

-- Designers can delete deliverables from their projects
CREATE POLICY "Designers can delete project deliverables"
  ON public.deliverables
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = deliverables.project_id
      AND pd.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: Create proper role-based delete policies for deliverable_versions
-- ============================================================================

-- Admins can delete any version
CREATE POLICY "Admins can delete deliverable_versions"
  ON public.deliverable_versions
  FOR DELETE
  USING (public.is_admin());

-- Designers can delete versions they uploaded
CREATE POLICY "Designers can delete own versions"
  ON public.deliverable_versions
  FOR DELETE
  USING (uploaded_by_id = auth.uid());

-- ============================================================================
-- STEP 6: Create proper role-based delete policies for deliverable_feedback
-- ============================================================================

-- Admins can delete any feedback
CREATE POLICY "Admins can delete deliverable_feedback"
  ON public.deliverable_feedback
  FOR DELETE
  USING (public.is_admin());

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON public.deliverable_feedback
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 7: Create proper admin-only policies for users table
-- ============================================================================

-- Admins can delete users (except themselves for safety)
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  USING (
    public.is_admin() AND id != auth.uid()
  );

-- ============================================================================
-- STEP 8: Add INSERT policy for users (for Miro app user creation)
-- Since auth.users trigger handles signup, we need admin INSERT for manual creation
-- ============================================================================

-- Drop if exists first
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;

-- Admins can create new users
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (public.is_admin());

-- Also allow the auth trigger to create users (it uses SECURITY DEFINER)
-- No policy needed for that since handle_new_user() runs as SECURITY DEFINER

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================

COMMENT ON POLICY "Admins can delete projects" ON public.projects IS
  'Only administrators can delete projects - fixes critical security vulnerability from migration 014';

COMMENT ON POLICY "Admins can delete users" ON public.users IS
  'Only administrators can delete users (except themselves) - fixes critical security vulnerability from migration 021';

-- ============================================================================
-- NOTE: For Miro app development/testing, you may need to use service_role key
-- instead of anon key for admin operations. The application-level auth should
-- validate the user is an admin before making these calls.
-- ============================================================================
