-- Migration: Fix users table for Miro app
-- The original design required users to exist in auth.users first
-- For a Miro app, we need to allow admins to create users directly

-- First, drop the foreign key constraint if it exists
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Add primary_board_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'primary_board_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN primary_board_id TEXT;
  END IF;
END $$;

-- Add is_super_admin column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'is_super_admin'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_super_admin BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Drop existing RLS policies to recreate them
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Admins can insert users" ON public.users;
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;
DROP POLICY IF EXISTS "Anyone can view users" ON public.users;

-- Create a helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- For Miro apps, we need more permissive policies since auth might be handled differently
-- Policy: Allow all authenticated users to view all users (needed for client selection)
CREATE POLICY "Authenticated users can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Admins can update all users
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Policy: Admins can insert new users
CREATE POLICY "Admins can insert users"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Policy: Admins can delete users
CREATE POLICY "Admins can delete users"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- For development/testing, also allow anon access to read users
-- Remove this in production if not needed
CREATE POLICY "Anon can view users"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon to insert for initial setup (remove in production)
CREATE POLICY "Anon can insert users"
  ON public.users
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Comment explaining the setup
COMMENT ON TABLE public.users IS 'User profiles for Miro app. Can be created directly without auth.users dependency for Miro OAuth users.';

-- =====================================================
-- Fix user_boards table RLS policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Users can view own boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can view user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can insert user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can update user_boards" ON public.user_boards;
DROP POLICY IF EXISTS "Anon can delete user_boards" ON public.user_boards;

-- Admins can do everything with user_boards
CREATE POLICY "Admins can manage all user_boards"
  ON public.user_boards
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Users can view their own board associations
CREATE POLICY "Users can view own boards"
  ON public.user_boards
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- For development: allow anon access
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
  USING (true);

CREATE POLICY "Anon can delete user_boards"
  ON public.user_boards
  FOR DELETE
  TO anon
  USING (true);

-- =====================================================
-- Fix app_settings table RLS policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Authenticated users can read app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anon can view app_settings" ON public.app_settings;
DROP POLICY IF EXISTS "Anon can manage app_settings" ON public.app_settings;

-- Admins can manage app settings
CREATE POLICY "Admins can manage app_settings"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin());

-- Everyone can read app settings
CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- For development: anon can manage settings
CREATE POLICY "Anon can manage app_settings"
  ON public.app_settings
  FOR ALL
  TO anon
  USING (true);

-- =====================================================
-- Fix projects table RLS policies (if needed)
-- =====================================================

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Anon can view projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Anon can update projects" ON public.projects;

-- For development: allow anon access to projects
CREATE POLICY "Anon can view projects"
  ON public.projects
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can insert projects"
  ON public.projects
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update projects"
  ON public.projects
  FOR UPDATE
  TO anon
  USING (true);
