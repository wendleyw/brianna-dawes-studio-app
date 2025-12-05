-- Migration: Add briefing JSONB column to projects table
-- This stores the project briefing data separately from description

-- Add briefing column
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS briefing JSONB DEFAULT '{}'::jsonb;

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_projects_briefing
ON public.projects USING GIN (briefing);

-- Add comment
COMMENT ON COLUMN public.projects.briefing IS 'Project briefing data including goals, overview, audience, etc.';

-- Add google_drive_url column if not exists
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS google_drive_url TEXT;

COMMENT ON COLUMN public.projects.google_drive_url IS 'Link to Google Drive folder for project files';
