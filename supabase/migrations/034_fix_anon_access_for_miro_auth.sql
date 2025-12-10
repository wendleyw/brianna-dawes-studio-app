-- Migration: Fix anon access for Miro SDK authentication model
-- APPLIED MANUALLY via Supabase MCP on 2025-12-09
--
-- CONTEXT:
-- The app uses Miro SDK for authentication, not Supabase Auth.
-- Users are identified by miro_user_id lookup, not auth.uid().
-- The Supabase client uses the anon key, so requests come as 'anon' role.
--
-- The previous migration (031) added policies that require 'authenticated' role
-- and use auth.uid(), which broke the app since users are 'anon'.
--
-- SOLUTION:
-- For now, add permissive policies for anon role to restore functionality.
-- Security is enforced at the application level (miroAuthService checks role).
--
-- TODO: Migrate to Supabase Auth for proper RLS-based security:
-- 1. Create Supabase users linked to Miro users
-- 2. Generate JWT tokens after Miro auth
-- 3. Use auth.uid() in RLS policies
--
-- WARNING: These policies are permissive for development/MVP.
-- They should be replaced with proper auth before production.

-- ============================================================================
-- STEP 1: Remove the broken 'Anon can delete' policy (leftover from old migration)
-- ============================================================================

DROP POLICY IF EXISTS "Anon can delete projects" ON public.projects;

-- ============================================================================
-- STEP 2: Add permissive anon policies for projects (temporary for Miro auth)
-- ============================================================================

-- Anon can view all projects (filtered by app logic)
CREATE POLICY "Anon can view projects"
  ON public.projects
  FOR SELECT
  TO anon
  USING (true);

-- Anon can insert projects (validated by app logic)
CREATE POLICY "Anon can insert projects"
  ON public.projects
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Anon can update projects (validated by app logic)
CREATE POLICY "Anon can update projects"
  ON public.projects
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Anon can delete projects (admin-only enforced by app logic)
CREATE POLICY "Anon can delete projects"
  ON public.projects
  FOR DELETE
  TO anon
  USING (true);

-- ============================================================================
-- STEP 3: Add permissive anon policies for project_designers
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can select project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anon can view project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anon can manage project_designers" ON public.project_designers;

CREATE POLICY "Anon can view project_designers"
  ON public.project_designers
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert project_designers"
  ON public.project_designers
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can delete project_designers"
  ON public.project_designers
  FOR DELETE
  TO anon
  USING (true);

-- ============================================================================
-- STEP 4: Add permissive anon policies for deliverables
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anon can manage deliverables" ON public.deliverables;

CREATE POLICY "Anon can view deliverables"
  ON public.deliverables
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert deliverables"
  ON public.deliverables
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update deliverables"
  ON public.deliverables
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete deliverables"
  ON public.deliverables
  FOR DELETE
  TO anon
  USING (true);

-- ============================================================================
-- STEP 5: Add permissive anon policies for users
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view users" ON public.users;

CREATE POLICY "Anon can view users"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert users"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update users"
  ON public.users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STEP 6: Add permissive anon policies for user_boards
-- ============================================================================

DROP POLICY IF EXISTS "Anon can view user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can manage user_boards" ON public.user_boards;

CREATE POLICY "Anon can view user_boards"
  ON public.user_boards
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert user_boards"
  ON public.user_boards
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update user_boards"
  ON public.user_boards
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete user_boards"
  ON public.user_boards
  FOR DELETE
  TO anon
  USING (true);

-- ============================================================================
-- STEP 7: Add permissive anon policies for deliverable_versions
-- ============================================================================

CREATE POLICY "Anon can view deliverable_versions"
  ON public.deliverable_versions
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert deliverable_versions"
  ON public.deliverable_versions
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can delete deliverable_versions"
  ON public.deliverable_versions
  FOR DELETE
  TO anon
  USING (true);

-- ============================================================================
-- STEP 8: Add permissive anon policies for deliverable_feedback
-- ============================================================================

CREATE POLICY "Anon can view deliverable_feedback"
  ON public.deliverable_feedback
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert deliverable_feedback"
  ON public.deliverable_feedback
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update deliverable_feedback"
  ON public.deliverable_feedback
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anon can delete deliverable_feedback"
  ON public.deliverable_feedback
  FOR DELETE
  TO anon
  USING (true);

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Anon can view projects" ON public.projects IS
  'TEMPORARY: Allows anon access for Miro SDK auth model. Security enforced at app level.
   TODO: Migrate to Supabase Auth and use proper RLS with auth.uid()';

-- ============================================================================
-- IMPORTANT SECURITY NOTE
-- ============================================================================

-- This migration restores functionality but relies on APPLICATION-LEVEL security:
-- 1. miroAuthService validates user identity via Miro SDK
-- 2. AuthProvider stores user role in state
-- 3. Components check user.role before showing admin features
-- 4. projectService validates user permissions before operations
--
-- For production, migrate to Supabase Auth:
-- 1. After Miro auth, create/sign-in Supabase user
-- 2. Store auth session in Supabase
-- 3. Use auth.uid() in RLS policies for true database-level security
