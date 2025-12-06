-- Migration: Fix missing anon UPDATE policy for users table
-- The Miro app uses anonymous Supabase access, so anon needs UPDATE permission
-- This was missing from migration 012, causing 406 errors when editing users

-- Drop existing policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Anon can update users" ON public.users;
DROP POLICY IF EXISTS "Anon can delete users" ON public.users;

-- Allow anon to UPDATE users (needed for Miro app admin panel)
CREATE POLICY "Anon can update users"
  ON public.users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to DELETE users (needed for Miro app admin panel)
CREATE POLICY "Anon can delete users"
  ON public.users
  FOR DELETE
  TO anon
  USING (true);

-- Add comment explaining this is for development/Miro app
COMMENT ON POLICY "Anon can update users" ON public.users IS
  'Allows anonymous updates from Miro app - application-level auth handles permissions';
COMMENT ON POLICY "Anon can delete users" ON public.users IS
  'Allows anonymous deletes from Miro app - application-level auth handles permissions';
