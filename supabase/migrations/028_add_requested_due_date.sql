-- Migration: Add requested_due_date for client due date change requests
-- This allows clients to request a due date change that requires admin approval

-- Add columns for due date request workflow
ALTER TABLE projects ADD COLUMN IF NOT EXISTS requested_due_date TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date_requested_at TIMESTAMPTZ;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date_requested_by UUID REFERENCES users(id);

-- Add comments for documentation
COMMENT ON COLUMN projects.requested_due_date IS 'Due date requested by client, pending admin approval';
COMMENT ON COLUMN projects.due_date_requested_at IS 'When the due date change was requested';
COMMENT ON COLUMN projects.due_date_requested_by IS 'User who requested the due date change';
