-- Add was_approved column to projects table
-- This tracks when a client has approved a project (separate from review/changes requested)

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS was_approved BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.was_approved IS 'Indicates if the client has approved this project for finalization';

-- Create index for filtering approved projects
CREATE INDEX IF NOT EXISTS idx_projects_was_approved ON public.projects(was_approved) WHERE was_approved = TRUE;
