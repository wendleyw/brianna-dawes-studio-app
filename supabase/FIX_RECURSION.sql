-- ============================================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- Run this in Supabase SQL Editor IMMEDIATELY
-- ============================================================================

-- Step 1: Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Designers can view project clients" ON public.users;
DROP POLICY IF EXISTS "Allow public user lookup for auth" ON public.users;
DROP POLICY IF EXISTS "Allow all reads for testing" ON public.users;

-- Step 2: Create a SECURITY DEFINER function to check user role
-- This function bypasses RLS, preventing recursion
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 3: Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, non-recursive policies

-- Allow anonymous users to read users (for Miro auth lookup)
CREATE POLICY "anon_can_read_users"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- Authenticated users can read their own profile
CREATE POLICY "users_read_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Authenticated users can update their own profile
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Admins can read all users (using SECURITY DEFINER function to avoid recursion)
CREATE POLICY "admins_read_all"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Admins can update all users
CREATE POLICY "admins_update_all"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_admin());

-- Admins can insert users
CREATE POLICY "admins_insert"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- Admins can delete users
CREATE POLICY "admins_delete"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- DONE! Test with this query:
-- ============================================================================
-- SELECT id, email, name, role, miro_user_id FROM public.users LIMIT 5;
