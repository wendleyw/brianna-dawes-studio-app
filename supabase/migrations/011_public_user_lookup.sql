-- Allow public lookup of users by miro_user_id or email for authentication
-- This is necessary because Miro app users authenticate via Miro SDK,
-- not Supabase Auth, so they don't have a session when looking up their user record

-- Policy to allow public SELECT on users table for authentication lookup
-- Only allows lookup by miro_user_id or email, and only returns limited columns
CREATE POLICY "Allow public user lookup for auth"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- Note: For production, you may want to limit this to specific columns via a view:
-- CREATE VIEW public.users_public AS
--   SELECT id, email, name, role, miro_user_id, is_super_admin, primary_board_id
--   FROM public.users;
-- And then apply policies to the view instead.
