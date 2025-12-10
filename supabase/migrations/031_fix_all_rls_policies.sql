-- Migration: Complete RLS Security Fix
-- This migration removes ALL overly permissive "Anyone can" and "Anon can" policies
-- and replaces them with proper role-based access control (RBAC)
--
-- CRITICAL SECURITY FIXES:
-- 1. Remove all "Anyone can select/insert/update" policies
-- 2. Remove all "Anon can *" policies
-- 3. Implement proper RBAC for Admin, Designer, Client roles
-- 4. Ensure Miro app works via authenticated Supabase session
--
-- NOTE: After this migration, all operations require authentication
-- The Miro app should use Supabase auth with the user's session

-- ============================================================================
-- STEP 1: DROP ALL DANGEROUS POLICIES
-- ============================================================================

-- Projects table
DROP POLICY IF EXISTS "Anyone can select projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can view projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can update projects" ON public.projects;

-- Project designers table
DROP POLICY IF EXISTS "Anyone can select project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can insert project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can update project_designers" ON public.project_designers;

-- Deliverables table
DROP POLICY IF EXISTS "Anyone can select deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can insert deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can update deliverables" ON public.deliverables;

-- Users table
DROP POLICY IF EXISTS "Anyone can select users" ON public.users;
DROP POLICY IF EXISTS "Anon can view users" ON public.users;
DROP POLICY IF EXISTS "Anon can insert users" ON public.users;

-- User boards table
DROP POLICY IF EXISTS "Anon can view user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can insert user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can update user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can delete user_boards" ON public.user_boards;

-- App settings table
DROP POLICY IF EXISTS "Anon can manage app_settings" ON public.app_settings;

-- ============================================================================
-- STEP 2: CREATE HELPER FUNCTIONS (if not exists)
-- ============================================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is designer
CREATE OR REPLACE FUNCTION public.is_designer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'designer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is client
CREATE OR REPLACE FUNCTION public.is_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is assigned to a project as designer
CREATE OR REPLACE FUNCTION public.is_project_designer(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_designers
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is the client of a project
CREATE OR REPLACE FUNCTION public.is_project_client(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND client_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 3: PROJECTS TABLE - PROPER RBAC
-- ============================================================================

-- Admins can do everything with projects
CREATE POLICY "Admins have full access to projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Designers can SELECT projects they are assigned to
CREATE POLICY "Designers can view assigned projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = projects.id AND pd.user_id = auth.uid()
    )
  );

-- Designers can UPDATE projects they are assigned to
CREATE POLICY "Designers can update assigned projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = projects.id AND pd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = projects.id AND pd.user_id = auth.uid()
    )
  );

-- Clients can SELECT their own projects only
CREATE POLICY "Clients can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_client() AND client_id = auth.uid()
  );

-- Clients can INSERT projects (as their own)
CREATE POLICY "Clients can create own projects"
  ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client() AND client_id = auth.uid()
  );

-- Clients can UPDATE their own projects (limited fields - handled by app logic)
CREATE POLICY "Clients can update own projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_client() AND client_id = auth.uid()
  )
  WITH CHECK (
    public.is_client() AND client_id = auth.uid()
  );

-- ============================================================================
-- STEP 4: PROJECT_DESIGNERS TABLE - PROPER RBAC
-- ============================================================================

-- Admins can manage all project-designer associations
CREATE POLICY "Admins have full access to project_designers"
  ON public.project_designers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Designers can view their own assignments
CREATE POLICY "Designers can view own assignments"
  ON public.project_designers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Clients can view designers assigned to their projects
CREATE POLICY "Clients can view project designers"
  ON public.project_designers
  FOR SELECT
  TO authenticated
  USING (
    public.is_client() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_designers.project_id AND p.client_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 5: DELIVERABLES TABLE - PROPER RBAC
-- ============================================================================

-- Admins can do everything with deliverables
CREATE POLICY "Admins have full access to deliverables"
  ON public.deliverables
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Designers can manage deliverables for their projects
CREATE POLICY "Designers can manage project deliverables"
  ON public.deliverables
  FOR ALL
  TO authenticated
  USING (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = deliverables.project_id AND pd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = deliverables.project_id AND pd.user_id = auth.uid()
    )
  );

-- Clients can view deliverables for their projects
CREATE POLICY "Clients can view project deliverables"
  ON public.deliverables
  FOR SELECT
  TO authenticated
  USING (
    public.is_client() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = deliverables.project_id AND p.client_id = auth.uid()
    )
  );

-- Clients can update deliverable status (approve/reject)
CREATE POLICY "Clients can update deliverable status"
  ON public.deliverables
  FOR UPDATE
  TO authenticated
  USING (
    public.is_client() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = deliverables.project_id AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_client() AND
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = deliverables.project_id AND p.client_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 6: USERS TABLE - PROPER RBAC
-- ============================================================================

-- Keep "Authenticated users can view all users" for lookups
-- But ensure it requires authentication
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
CREATE POLICY "Authenticated users can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update own profile (already exists, but recreate for safety)
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 7: USER_BOARDS TABLE - PROPER RBAC
-- ============================================================================

-- Already has proper policies from 012, just ensure no anon access
-- Admins can manage all (exists)
-- Users can view own (exists)

-- ============================================================================
-- STEP 8: APP_SETTINGS TABLE - PROPER RBAC
-- ============================================================================

-- Already has "Anyone can read app_settings" which is OK for public settings
-- Remove anon management capability (done above)

-- ============================================================================
-- STEP 9: DELIVERABLE_VERSIONS TABLE - ENSURE PROPER RBAC
-- ============================================================================

-- Drop any permissive policies
DROP POLICY IF EXISTS "Anyone can select deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anyone can insert deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anyone can update deliverable_versions" ON public.deliverable_versions;

-- Admins can manage all versions (may already exist)
DROP POLICY IF EXISTS "Admins have full access to versions" ON public.deliverable_versions;
CREATE POLICY "Admins have full access to versions"
  ON public.deliverable_versions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Designers can manage versions for their projects
DROP POLICY IF EXISTS "Designers can manage versions" ON public.deliverable_versions;
CREATE POLICY "Designers can manage versions"
  ON public.deliverable_versions
  FOR ALL
  TO authenticated
  USING (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.project_designers pd ON pd.project_id = d.project_id
      WHERE d.id = deliverable_versions.deliverable_id AND pd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.project_designers pd ON pd.project_id = d.project_id
      WHERE d.id = deliverable_versions.deliverable_id AND pd.user_id = auth.uid()
    )
  );

-- Clients can view versions for their projects
DROP POLICY IF EXISTS "Clients can view versions" ON public.deliverable_versions;
CREATE POLICY "Clients can view versions"
  ON public.deliverable_versions
  FOR SELECT
  TO authenticated
  USING (
    public.is_client() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deliverable_versions.deliverable_id AND p.client_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 10: DELIVERABLE_FEEDBACK TABLE - ENSURE PROPER RBAC
-- ============================================================================

-- Drop any permissive policies
DROP POLICY IF EXISTS "Anyone can select deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anyone can insert deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anyone can update deliverable_feedback" ON public.deliverable_feedback;

-- Admins can manage all feedback (may already exist)
DROP POLICY IF EXISTS "Admins have full access to feedback" ON public.deliverable_feedback;
CREATE POLICY "Admins have full access to feedback"
  ON public.deliverable_feedback
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Designers can manage feedback for their projects
DROP POLICY IF EXISTS "Designers can manage project feedback" ON public.deliverable_feedback;
CREATE POLICY "Designers can manage project feedback"
  ON public.deliverable_feedback
  FOR ALL
  TO authenticated
  USING (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.project_designers pd ON pd.project_id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id AND pd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_designer() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.project_designers pd ON pd.project_id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id AND pd.user_id = auth.uid()
    )
  );

-- Clients can create and view feedback on their projects
DROP POLICY IF EXISTS "Clients can create feedback" ON public.deliverable_feedback;
CREATE POLICY "Clients can create feedback"
  ON public.deliverable_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_client() AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id AND p.client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Clients can view project feedback" ON public.deliverable_feedback;
CREATE POLICY "Clients can view project feedback"
  ON public.deliverable_feedback
  FOR SELECT
  TO authenticated
  USING (
    public.is_client() AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id AND p.client_id = auth.uid()
    )
  );

-- Users can update their own feedback
DROP POLICY IF EXISTS "Users can update own feedback" ON public.deliverable_feedback;
CREATE POLICY "Users can update own feedback"
  ON public.deliverable_feedback
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON POLICY "Admins have full access to projects" ON public.projects IS
  'Administrators have complete CRUD access to all projects';

COMMENT ON POLICY "Designers can view assigned projects" ON public.projects IS
  'Designers can only view projects they are assigned to via project_designers';

COMMENT ON POLICY "Designers can update assigned projects" ON public.projects IS
  'Designers can update projects they are assigned to';

COMMENT ON POLICY "Clients can view own projects" ON public.projects IS
  'Clients can only view projects where they are the client_id - NO cross-client visibility';

COMMENT ON POLICY "Clients can create own projects" ON public.projects IS
  'Clients can create new projects with themselves as the client';

-- ============================================================================
-- IMPORTANT NOTES
-- ============================================================================

-- After this migration:
-- 1. ALL operations require authentication (TO authenticated)
-- 2. Admins have full access to everything
-- 3. Designers can only access their assigned projects
-- 4. Clients can only access their own projects (NO board-based sharing)
-- 5. Anonymous access is completely blocked
--
-- The Miro app MUST authenticate users via Supabase before making any DB calls
-- Use the miroAuthService to get user credentials and create a Supabase session
