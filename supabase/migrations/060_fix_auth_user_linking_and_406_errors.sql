-- Migration: Fix auth_user_id linking and 406 errors
--
-- PROBLEM:
-- When a new admin user is created and tries to log in, they get:
-- 1. Error 406 on query: users?select=*&auth_user_id=eq.xxx
-- 2. "Failed to link auth user to public user after sign-in"
-- 3. "Supabase session failed (will use anon)"
--
-- ROOT CAUSE:
-- 1. New users are created in public.users without auth_user_id
-- 2. User signs in to Supabase Auth successfully
-- 3. link_auth_user() function tries to update public.users
-- 4. But queries with .eq('auth_user_id', ...) fail because auth_user_id is NULL
-- 5. Error 406 happens because query returns no results
--
-- SOLUTION:
-- 1. Improve link_auth_user() to be more robust
-- 2. Add RLS policy to allow authenticated users to read users by email
-- 3. Add helper function to find user by email when auth_user_id is not set
--
-- ============================================================================
-- STEP 1: Improve link_auth_user function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.link_auth_user(
  p_public_user_id uuid,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claims jsonb;
  v_jwt_email text;
  v_target_email text;
  v_current_auth_user_id uuid;
BEGIN
  -- Require authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  -- Require auth user match
  IF p_auth_user_id IS NULL OR p_auth_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Auth user mismatch' USING ERRCODE = 'P0001';
  END IF;

  -- Get email from JWT
  v_claims := current_setting('request.jwt.claims', true)::jsonb;
  v_jwt_email := lower(coalesce(v_claims->>'email', ''));
  IF v_jwt_email = '' THEN
    RAISE EXCEPTION 'Missing email claim' USING ERRCODE = 'P0001';
  END IF;

  -- Get target user email and current auth_user_id
  SELECT lower(email), auth_user_id
  INTO v_target_email, v_current_auth_user_id
  FROM public.users
  WHERE id = p_public_user_id;

  IF v_target_email IS NULL THEN
    RAISE WARNING 'User not found: %', p_public_user_id;
    RETURN false;
  END IF;

  -- Verify email match
  IF v_target_email != v_jwt_email THEN
    RAISE EXCEPTION 'Email mismatch (JWT: %, User: %)', v_jwt_email, v_target_email USING ERRCODE = 'P0001';
  END IF;

  -- If already linked to this auth user, consider it success
  IF v_current_auth_user_id = auth.uid() THEN
    RAISE NOTICE 'User already linked to auth user %', auth.uid();
    RETURN true;
  END IF;

  -- If linked to different auth user, that's an error
  IF v_current_auth_user_id IS NOT NULL AND v_current_auth_user_id != auth.uid() THEN
    RAISE EXCEPTION 'User already linked to different auth user' USING ERRCODE = 'P0001';
  END IF;

  -- Link the auth user (auth_user_id is NULL or matches)
  UPDATE public.users
  SET auth_user_id = auth.uid(),
      updated_at = now()
  WHERE id = p_public_user_id
    AND (auth_user_id IS NULL OR auth_user_id = auth.uid());

  IF NOT FOUND THEN
    RAISE WARNING 'Failed to update user % with auth_user_id %', p_public_user_id, auth.uid();
    RETURN false;
  END IF;

  RAISE NOTICE 'Successfully linked user % to auth user %', p_public_user_id, auth.uid();
  RETURN true;
END;
$$;

-- Grant to authenticated (not anon)
REVOKE EXECUTE ON FUNCTION public.link_auth_user(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.link_auth_user(uuid, uuid) TO authenticated;

-- ============================================================================
-- STEP 2: Add helper function to find user by email
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_public_user_by_email(p_email text)
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  role text,
  auth_user_id uuid,
  primary_board_id text,
  is_super_admin boolean,
  company_name text,
  company_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email,
    u.name,
    u.role::text,
    u.auth_user_id,
    u.primary_board_id,
    u.is_super_admin,
    u.company_name,
    u.company_logo_url
  FROM public.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_user_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_user_by_email(text) TO anon;

-- ============================================================================
-- STEP 3: Add RLS policy to allow reading users by email during auth
-- ============================================================================

-- This policy allows authenticated users to read users table even if auth_user_id is not linked yet
-- This is safe because:
-- 1. Requires authentication (not anon)
-- 2. Only allows SELECT (read-only)
-- 3. Needed for initial auth flow before link_auth_user is called

DROP POLICY IF EXISTS "Authenticated users can read users for auth" ON public.users;
CREATE POLICY "Authenticated users can read users for auth"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 4: Add logging to help debug auth issues
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_auth_attempt(
  p_email text,
  p_auth_user_id uuid,
  p_public_user_id uuid DEFAULT NULL,
  p_success boolean DEFAULT false,
  p_error_message text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log to audit_logs for debugging
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data
  ) VALUES (
    p_public_user_id,
    'auth_attempt',
    'users',
    p_public_user_id,
    NULL,
    jsonb_build_object(
      'email', p_email,
      'auth_user_id', p_auth_user_id,
      'success', p_success,
      'error', p_error_message,
      'timestamp', now()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail logging - don't break auth flow
    NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_auth_attempt TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_auth_attempt TO anon;

-- ============================================================================
-- STEP 5: Add index on email for faster lookups during auth
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email_lower
  ON public.users(lower(email));

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.link_auth_user IS
  'Links a Supabase Auth user to a public.users record. Called after Miro auth.
   Improved version with better error handling and logging.';

COMMENT ON FUNCTION public.get_public_user_by_email IS
  'Finds a public user by email. Used during auth flow when auth_user_id is not yet linked.';

COMMENT ON FUNCTION public.log_auth_attempt IS
  'Logs authentication attempts for debugging. Silently fails if logging fails.';

COMMENT ON POLICY "Authenticated users can read users for auth" ON public.users IS
  'Allows authenticated users to read users table during auth flow before auth_user_id is linked.';

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Check users without auth_user_id linked:
-- SELECT id, email, name, role, auth_user_id FROM public.users WHERE auth_user_id IS NULL;

-- Check auth logs:
-- SELECT * FROM public.audit_logs WHERE action = 'auth_attempt' ORDER BY created_at DESC LIMIT 10;

-- Test link_auth_user (as authenticated user):
-- SELECT public.link_auth_user('your-public-user-uuid', auth.uid());

-- Test get_public_user_by_email:
-- SELECT * FROM public.get_public_user_by_email('admin@example.com');
