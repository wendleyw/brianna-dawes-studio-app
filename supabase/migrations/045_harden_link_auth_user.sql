-- Harden link_auth_user to prevent account hijacking.
--
-- Threat model:
-- The previous implementation allowed anon callers to link an auth user to any
-- public.users row with auth_user_id IS NULL if they knew/guessed the UUID.
--
-- This version:
-- - Requires authenticated caller
-- - Requires p_auth_user_id == auth.uid()
-- - Requires JWT email claim to match public.users.email
-- - Removes anon EXECUTE privilege

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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  IF p_auth_user_id IS NULL OR p_auth_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Auth user mismatch' USING ERRCODE = 'P0001';
  END IF;

  v_claims := current_setting('request.jwt.claims', true)::jsonb;
  v_jwt_email := lower(coalesce(v_claims->>'email', ''));
  IF v_jwt_email = '' THEN
    RAISE EXCEPTION 'Missing email claim' USING ERRCODE = 'P0001';
  END IF;

  SELECT lower(email)
  INTO v_target_email
  FROM public.users
  WHERE id = p_public_user_id;

  IF v_target_email IS NULL THEN
    RETURN false;
  END IF;

  IF v_target_email != v_jwt_email THEN
    RAISE EXCEPTION 'Email mismatch' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.users
  SET auth_user_id = auth.uid()
  WHERE id = p_public_user_id
    AND (auth_user_id IS NULL OR auth_user_id = auth.uid());

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_auth_user(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.link_auth_user(uuid, uuid) TO authenticated;

