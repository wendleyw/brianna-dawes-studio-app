-- Extend realtime to additional tables for full synchronization
-- Run this after the base realtime migration (008)

-- Enable realtime for users table (for role changes, profile updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;

-- Enable realtime for user_boards table (for board assignments)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_boards;

-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for project_updates table (for activity feed)
-- Check if table exists first
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'project_updates') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.project_updates';
  END IF;
END $$;
