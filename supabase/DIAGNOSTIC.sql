-- ============================================================================
-- DIAGNOSTIC SCRIPT - Run this in Supabase SQL Editor to check the database
-- ============================================================================

-- 1. Check if the users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'users'
) AS users_table_exists;

-- 2. Check if the projects table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'projects'
) AS projects_table_exists;

-- 3. Check if project_designers table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'project_designers'
) AS project_designers_table_exists;

-- 4. List all policies on users table
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public';

-- 5. Check if RLS is enabled on users
SELECT
  relname,
  relrowsecurity
FROM pg_class
WHERE relname = 'users';

-- 6. Try a simple query (this should show if there's a policy error)
SELECT id, email, name, role, miro_user_id
FROM public.users
LIMIT 1;

-- 7. Check for the specific user role enum
SELECT EXISTS (
  SELECT FROM pg_type WHERE typname = 'user_role'
) AS user_role_enum_exists;

-- ============================================================================
-- If step 6 fails, run this to temporarily disable RLS:
-- ============================================================================
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
--
-- Then retry step 6. If it works, the problem is in the RLS policies.
-- ============================================================================
