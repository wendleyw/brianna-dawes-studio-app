-- Migration: Link auth.users with public.users for RLS
--
-- This migration adds infrastructure to support Supabase Auth integration:
-- 1. Adds auth_user_id column to link public.users to auth.users
-- 2. Creates a function to get user's role by auth.uid()
-- 3. Updates RLS policies to use auth.uid() when authenticated
--
-- The app flow is:
-- 1. User authenticates via Miro SDK
-- 2. App creates/signs in Supabase Auth user (supabaseAuthBridge)
-- 3. RLS policies check auth.uid() for authenticated requests
-- 4. Fallback to anon policies for unauthenticated requests

-- ============================================================================
-- STEP 1: Add auth_user_id column to public.users
-- ============================================================================

-- Add column to link auth.users to public.users
-- This allows RLS to find the public.users record from auth.uid()
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- ============================================================================
-- STEP 2: Create helper function to get user info by auth.uid()
-- ============================================================================

-- Get the public.users.id from auth.uid()
CREATE OR REPLACE FUNCTION public.get_user_id_from_auth()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user role by auth.uid()
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::TEXT FROM public.users
    WHERE auth_user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current auth user is admin
CREATE OR REPLACE FUNCTION public.is_auth_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current auth user is designer
CREATE OR REPLACE FUNCTION public.is_auth_designer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'designer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current auth user is client
CREATE OR REPLACE FUNCTION public.is_auth_client()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_user_id = auth.uid() AND role = 'client'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 3: Create function to link auth user after signup
-- ============================================================================

-- Function to link auth user ID to public user
-- Called after Supabase Auth signup/signin
CREATE OR REPLACE FUNCTION public.link_auth_user(
  p_public_user_id UUID,
  p_auth_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users
  SET auth_user_id = p_auth_user_id
  WHERE id = p_public_user_id
    AND (auth_user_id IS NULL OR auth_user_id = p_auth_user_id);

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.link_auth_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_auth_user TO anon;

-- ============================================================================
-- STEP 4: Update RLS policies for authenticated users
-- ============================================================================

-- Projects: Authenticated admins have full access
DROP POLICY IF EXISTS "Auth admins have full access to projects" ON public.projects;
CREATE POLICY "Auth admins have full access to projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING (public.is_auth_admin())
  WITH CHECK (public.is_auth_admin());

-- Projects: Authenticated designers can view/update assigned projects
DROP POLICY IF EXISTS "Auth designers can view assigned projects" ON public.projects;
CREATE POLICY "Auth designers can view assigned projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_auth_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      JOIN public.users u ON u.id = pd.user_id
      WHERE pd.project_id = projects.id AND u.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auth designers can update assigned projects" ON public.projects;
CREATE POLICY "Auth designers can update assigned projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_auth_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      JOIN public.users u ON u.id = pd.user_id
      WHERE pd.project_id = projects.id AND u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_auth_designer() AND
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      JOIN public.users u ON u.id = pd.user_id
      WHERE pd.project_id = projects.id AND u.auth_user_id = auth.uid()
    )
  );

-- Projects: Authenticated clients can view/update own projects
DROP POLICY IF EXISTS "Auth clients can view own projects" ON public.projects;
CREATE POLICY "Auth clients can view own projects"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    public.is_auth_client() AND
    client_id = public.get_user_id_from_auth()
  );

DROP POLICY IF EXISTS "Auth clients can update own projects" ON public.projects;
CREATE POLICY "Auth clients can update own projects"
  ON public.projects
  FOR UPDATE
  TO authenticated
  USING (
    public.is_auth_client() AND
    client_id = public.get_user_id_from_auth()
  )
  WITH CHECK (
    public.is_auth_client() AND
    client_id = public.get_user_id_from_auth()
  );

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.users.auth_user_id IS
  'Links to auth.users(id) for Supabase Auth integration. Set after Miro auth via supabaseAuthBridge.';

COMMENT ON FUNCTION public.is_auth_admin() IS
  'Returns true if current authenticated user (via auth.uid()) is an admin';

COMMENT ON FUNCTION public.link_auth_user IS
  'Links a Supabase Auth user to a public.users record. Called after Miro auth.';
