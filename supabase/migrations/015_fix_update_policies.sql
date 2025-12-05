-- Migration: Fix RLS policies for projects and related tables
-- This ensures projects can be accessed from the Miro app context (unauthenticated)
-- NOTE: These policies allow unauthenticated access for development purposes
-- In production, you should restrict these to authenticated users

-- ============================================================================
-- PROJECTS TABLE
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins have full access to projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can view assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Designers can update assigned projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can update projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can select projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can insert projects" ON public.projects;

-- Policy: Allow anyone to SELECT projects
CREATE POLICY "Anyone can select projects"
  ON public.projects
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to INSERT projects
CREATE POLICY "Anyone can insert projects"
  ON public.projects
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to UPDATE projects
CREATE POLICY "Anyone can update projects"
  ON public.projects
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- PROJECT_DESIGNERS TABLE
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins have full access to project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Designers can view own assignments" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can update project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can select project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Anyone can insert project_designers" ON public.project_designers;

-- Policy: Allow anyone to SELECT project_designers
CREATE POLICY "Anyone can select project_designers"
  ON public.project_designers
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to INSERT project_designers
CREATE POLICY "Anyone can insert project_designers"
  ON public.project_designers
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to UPDATE project_designers
CREATE POLICY "Anyone can update project_designers"
  ON public.project_designers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- DELIVERABLES TABLE
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can update deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can select deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can insert deliverables" ON public.deliverables;

-- Policy: Allow anyone to SELECT deliverables
CREATE POLICY "Anyone can select deliverables"
  ON public.deliverables
  FOR SELECT
  USING (true);

-- Policy: Allow anyone to INSERT deliverables
CREATE POLICY "Anyone can insert deliverables"
  ON public.deliverables
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow anyone to UPDATE deliverables
CREATE POLICY "Anyone can update deliverables"
  ON public.deliverables
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- USERS TABLE (ensure Miro app can read users)
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can select users" ON public.users;

-- Policy: Allow anyone to SELECT users (needed for client/designer lookups)
CREATE POLICY "Anyone can select users"
  ON public.users
  FOR SELECT
  USING (true);

-- Add comments
COMMENT ON POLICY "Anyone can update projects" ON public.projects IS 'Allows updates from Miro app - restrict in production';
COMMENT ON POLICY "Anyone can select projects" ON public.projects IS 'Allows reads from Miro app - restrict in production';
