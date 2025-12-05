-- ============================================================================
-- EMERGENCY FIX - Drop ALL policies and recreate safe ones
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Step 1: Drop ALL policies on users table
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Designers can view project clients" ON public.users;
DROP POLICY IF EXISTS "Allow public user lookup for auth" ON public.users;

-- Step 2: Verify RLS is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 3: Create a single permissive policy for anon users
-- This is the simplest possible policy - just allow all reads
CREATE POLICY "Allow all reads for testing"
  ON public.users
  FOR SELECT
  USING (true);

-- Step 4: Allow authenticated users to update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Step 5: Test query - this should work now
-- Uncomment to test:
-- SELECT id, email, name, role, miro_user_id FROM public.users LIMIT 5;

-- ============================================================================
-- If the above works, you can later add more restrictive policies
-- For now, this allows the app to function while we debug
-- ============================================================================
