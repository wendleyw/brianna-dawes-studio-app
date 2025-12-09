-- Migration: Add due_date_approved for due date approval workflow
-- When a project is created with a due date, it stays "in analysis" until admin approves it

-- Add column for due date approval status (defaults to false for new projects)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date_approved BOOLEAN DEFAULT FALSE;

-- Update existing projects to have approved dates (since they were created before this workflow)
UPDATE projects SET due_date_approved = TRUE WHERE due_date IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN projects.due_date_approved IS 'Whether the due date has been approved by admin. False = Em análise';
