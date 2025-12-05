-- Add was_reviewed column to projects table
-- This tracks when a client has reviewed the project

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS was_reviewed BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.was_reviewed IS 'Indicates if the client has reviewed this project';
