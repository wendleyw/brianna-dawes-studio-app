-- Migration: Remove unused Miro OAuth token columns
--
-- RATIONALE:
-- The miro_access_token and miro_refresh_token columns were added for a planned
-- OAuth flow that was never implemented. The app uses Miro SDK's built-in
-- authentication instead (via window.miro.board.getUserInfo()).
--
-- Having unused columns that could store sensitive tokens is a security risk:
-- 1. They could be accidentally populated with sensitive data
-- 2. They add confusion about the authentication model
-- 3. They increase the attack surface unnecessarily
--
-- This migration removes these unused columns. If OAuth tokens are needed in
-- the future, they should be implemented with proper encryption from the start.

-- ============================================================================
-- STEP 1: Verify columns are empty (safety check)
-- ============================================================================

DO $$
DECLARE
  tokens_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tokens_count
  FROM users
  WHERE miro_access_token IS NOT NULL OR miro_refresh_token IS NOT NULL;

  IF tokens_count > 0 THEN
    RAISE EXCEPTION 'Cannot remove columns: % users have token data', tokens_count;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop the unused columns
-- ============================================================================

ALTER TABLE public.users DROP COLUMN IF EXISTS miro_access_token;
ALTER TABLE public.users DROP COLUMN IF EXISTS miro_refresh_token;
ALTER TABLE public.users DROP COLUMN IF EXISTS miro_token_expires_at;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.users IS
  'User profiles linked to Supabase auth.users. Authentication with Miro is done
   via SDK (miro_user_id lookup), not OAuth tokens. If OAuth is needed in the
   future, implement with pgcrypto encryption from the start.';
