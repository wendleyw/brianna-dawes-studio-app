-- Migration: Allow clients to view all projects on their board
-- Clients should see projects where:
-- 1. They are the client_id (owner), OR
-- 2. The project is on their primary board

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Clients can view own projects" ON public.projects;

-- Create new policy that allows clients to see all projects on their board
CREATE POLICY "Clients can view board projects"
  ON public.projects
  FOR SELECT
  USING (
    -- Client is the project owner
    client_id = auth.uid()
    OR
    -- Project is on the client's primary board
    (
      miro_board_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'client'
        AND primary_board_id = projects.miro_board_id
      )
    )
  );

COMMENT ON POLICY "Clients can view board projects" ON public.projects
  IS 'Allows clients to view projects they own OR projects on their primary Miro board';
