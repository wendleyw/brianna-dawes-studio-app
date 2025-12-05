-- Migration: Fix delete policies for projects and related tables
-- This ensures projects can be deleted from the Miro app context
-- NOTE: These policies allow unauthenticated delete for development purposes

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Anyone can delete project_designers" ON public.project_designers;
DROP POLICY IF EXISTS "Admins can delete deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Anyone can delete deliverables" ON public.deliverables;
DROP POLICY IF EXISTS "Admins can delete deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Anyone can delete deliverable_versions" ON public.deliverable_versions;
DROP POLICY IF EXISTS "Admins can delete deliverable_feedback" ON public.deliverable_feedback;
DROP POLICY IF EXISTS "Anyone can delete deliverable_feedback" ON public.deliverable_feedback;

-- Policy: Allow anyone to delete projects (for Miro app dev tools)
-- In production, you may want to restrict this to authenticated admins only
CREATE POLICY "Anyone can delete projects"
  ON public.projects
  FOR DELETE
  USING (true);

-- Policy: Allow delete on project_designers (junction table)
CREATE POLICY "Anyone can delete project_designers"
  ON public.project_designers
  FOR DELETE
  USING (true);

-- Policy: Allow delete on deliverables
CREATE POLICY "Anyone can delete deliverables"
  ON public.deliverables
  FOR DELETE
  USING (true);

-- Policy: Allow delete on deliverable_versions
CREATE POLICY "Anyone can delete deliverable_versions"
  ON public.deliverable_versions
  FOR DELETE
  USING (true);

-- Policy: Allow delete on deliverable_feedback
CREATE POLICY "Anyone can delete deliverable_feedback"
  ON public.deliverable_feedback
  FOR DELETE
  USING (true);

-- Add comment
COMMENT ON POLICY "Anyone can delete projects" ON public.projects IS 'Allows deletion from Miro app dev tools - consider restricting in production';
