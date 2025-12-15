-- Migration: Create ensure_super_admin function
-- This function creates or retrieves the super admin user, bypassing RLS

-- Drop if exists to allow re-running
DROP FUNCTION IF EXISTS public.ensure_super_admin(text, text, text);

-- Create the function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.ensure_super_admin(
  p_email text,
  p_name text,
  p_miro_user_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_record record;
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));

  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM public.users
  WHERE email = p_email;

  IF v_user_id IS NULL THEN
    -- Create new super admin user
    INSERT INTO public.users (
      email,
      name,
      role,
      is_super_admin,
      miro_user_id,
      created_at,
      updated_at
    ) VALUES (
      p_email,
      COALESCE(p_name, 'Admin'),
      'admin',
      true,
      p_miro_user_id,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_user_id;

    RAISE NOTICE 'Created new super admin: %', p_email;
  ELSE
    -- Update existing user to ensure they are super admin
    UPDATE public.users
    SET
      is_super_admin = true,
      role = 'admin',
      miro_user_id = COALESCE(p_miro_user_id, miro_user_id),
      updated_at = NOW()
    WHERE id = v_user_id
    AND (is_super_admin IS NOT TRUE OR role != 'admin' OR (p_miro_user_id IS NOT NULL AND miro_user_id IS DISTINCT FROM p_miro_user_id));

    RAISE NOTICE 'Updated existing user to super admin: %', p_email;
  END IF;

  -- Fetch and return the full user record
  SELECT
    id,
    email,
    name,
    role,
    primary_board_id,
    is_super_admin,
    miro_user_id,
    company_name,
    company_logo_url
  INTO v_user_record
  FROM public.users
  WHERE id = v_user_id;

  RETURN jsonb_build_object(
    'id', v_user_record.id,
    'email', v_user_record.email,
    'name', v_user_record.name,
    'role', v_user_record.role,
    'primary_board_id', v_user_record.primary_board_id,
    'is_super_admin', v_user_record.is_super_admin,
    'miro_user_id', v_user_record.miro_user_id,
    'company_name', v_user_record.company_name,
    'company_logo_url', v_user_record.company_logo_url
  );
END;
$$;

-- Grant execute to anon and authenticated (needed for initial login)
GRANT EXECUTE ON FUNCTION public.ensure_super_admin(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_super_admin(text, text, text) TO authenticated;

COMMENT ON FUNCTION public.ensure_super_admin IS
'Creates or retrieves the super admin user. Uses SECURITY DEFINER to bypass RLS for initial setup.';
