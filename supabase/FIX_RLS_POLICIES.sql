-- ============================================================================
-- FIX RLS POLICIES - Run this to fix the 500 error
-- ============================================================================

-- Drop the problematic policy that causes 500 errors
DROP POLICY IF EXISTS "Designers can view project clients" ON public.users;

-- Recreate the policy with proper safeguards
-- This version only runs the subquery if the user is authenticated
CREATE POLICY "Designers can view project clients"
  ON public.users
  FOR SELECT
  USING (
    -- Only evaluate this complex condition for authenticated users
    auth.uid() IS NOT NULL AND
    role = 'client' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_designers pd ON p.id = pd.project_id
      WHERE pd.user_id = auth.uid() AND p.client_id = users.id
    )
  );

-- Verify the anon policy exists and works correctly
DROP POLICY IF EXISTS "Allow public user lookup for auth" ON public.users;

CREATE POLICY "Allow public user lookup for auth"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- Also ensure authenticated users can read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ============================================================================
-- Verify: Run this query to test if it works
-- ============================================================================
-- SELECT id, email, name, role, miro_user_id FROM public.users LIMIT 1;
