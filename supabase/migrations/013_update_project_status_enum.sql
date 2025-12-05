-- Migration: Update project_status enum to 7 timeline statuses
-- This replaces the old 4-status system with a unified 7-status timeline

-- Step 0: Drop dependent views (will be recreated at the end)
DROP VIEW IF EXISTS public.projects_with_stats CASCADE;
DROP VIEW IF EXISTS public.activity_feed CASCADE;

-- Step 1: Create new enum type with all 7 statuses
CREATE TYPE project_status_new AS ENUM (
  'critical',      -- Urgent & overdue - needs immediate attention
  'overdue',       -- Past due date
  'urgent',        -- High priority, deadline approaching
  'on_track',      -- Normal priority, on schedule
  'in_progress',   -- Actively being worked on
  'review',        -- Awaiting client review/approval
  'done'           -- Completed or archived
);

-- Step 2: Add a temporary column with new type
ALTER TABLE public.projects ADD COLUMN status_new project_status_new;

-- Step 3: Migrate existing data
-- Map old statuses to new statuses based on the derivation logic
UPDATE public.projects SET status_new = CASE
  -- completed/archived -> done
  WHEN status = 'completed' THEN 'done'::project_status_new
  WHEN status = 'archived' THEN 'done'::project_status_new

  -- on_hold -> review
  WHEN status = 'on_hold' THEN 'review'::project_status_new

  -- active with urgent priority
  WHEN status = 'active' AND priority = 'urgent' AND due_date < NOW() THEN 'critical'::project_status_new
  WHEN status = 'active' AND priority = 'urgent' THEN 'urgent'::project_status_new

  -- active with high priority
  WHEN status = 'active' AND priority = 'high' AND due_date < NOW() THEN 'overdue'::project_status_new
  WHEN status = 'active' AND priority = 'high' THEN 'in_progress'::project_status_new

  -- active overdue (any priority)
  WHEN status = 'active' AND due_date < NOW() THEN 'overdue'::project_status_new

  -- active on track (default)
  ELSE 'on_track'::project_status_new
END;

-- Step 4: Drop old column and rename new one
ALTER TABLE public.projects DROP COLUMN status;
ALTER TABLE public.projects RENAME COLUMN status_new TO status;

-- Step 5: Set NOT NULL and default
ALTER TABLE public.projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'on_track'::project_status_new;

-- Step 6: Drop old enum type
DROP TYPE project_status;

-- Step 7: Rename new enum to original name
ALTER TYPE project_status_new RENAME TO project_status;

-- Step 8: Recreate the index on status
DROP INDEX IF EXISTS idx_projects_status;
CREATE INDEX idx_projects_status ON public.projects(status);

-- Note: The 'priority' column is kept for backward compatibility
-- but is no longer used to derive status. It can be used for
-- additional sorting/filtering within the same status column.

COMMENT ON COLUMN public.projects.status IS 'Project timeline status: critical, overdue, urgent, on_track, in_progress, review, done';

-- Step 9: Recreate the views that were dropped

-- Recreate projects_with_stats view
CREATE OR REPLACE VIEW public.projects_with_stats AS
SELECT
  p.*,
  u.name as client_name,
  u.email as client_email,
  u.avatar_url as client_avatar_url,
  (SELECT COUNT(*) FROM public.deliverables d WHERE d.project_id = p.id) as deliverables_count,
  (SELECT COUNT(*) FROM public.deliverables d WHERE d.project_id = p.id AND d.status = 'in_review') as pending_reviews_count,
  (SELECT COUNT(*) FROM public.deliverables d WHERE d.project_id = p.id AND d.due_date < NOW() AND d.status NOT IN ('delivered', 'approved')) as overdue_count,
  (SELECT array_agg(jsonb_build_object(
    'id', pd_u.id,
    'name', pd_u.name,
    'email', pd_u.email,
    'avatar_url', pd_u.avatar_url
  ))
  FROM public.project_designers pd
  JOIN public.users pd_u ON pd_u.id = pd.user_id
  WHERE pd.project_id = p.id) as designers
FROM public.projects p
JOIN public.users u ON u.id = p.client_id;

-- Recreate activity_feed view
CREATE OR REPLACE VIEW public.activity_feed AS
SELECT
  'deliverable_created' as activity_type,
  d.id as item_id,
  d.name as item_name,
  d.project_id,
  p.name as project_name,
  NULL as user_id,
  NULL as user_name,
  d.created_at as activity_time
FROM public.deliverables d
JOIN public.projects p ON p.id = d.project_id

UNION ALL

SELECT
  'version_uploaded' as activity_type,
  v.id as item_id,
  d.name as item_name,
  d.project_id,
  p.name as project_name,
  v.uploaded_by_id as user_id,
  u.name as user_name,
  v.created_at as activity_time
FROM public.deliverable_versions v
JOIN public.deliverables d ON d.id = v.deliverable_id
JOIN public.projects p ON p.id = d.project_id
JOIN public.users u ON u.id = v.uploaded_by_id

UNION ALL

SELECT
  'feedback_added' as activity_type,
  f.id as item_id,
  d.name as item_name,
  d.project_id,
  p.name as project_name,
  f.user_id,
  u.name as user_name,
  f.created_at as activity_time
FROM public.deliverable_feedback f
JOIN public.deliverables d ON d.id = f.deliverable_id
JOIN public.projects p ON p.id = d.project_id
JOIN public.users u ON u.id = f.user_id

UNION ALL

SELECT
  'status_changed' as activity_type,
  d.id as item_id,
  d.name as item_name,
  d.project_id,
  p.name as project_name,
  NULL as user_id,
  NULL as user_name,
  d.updated_at as activity_time
FROM public.deliverables d
JOIN public.projects p ON p.id = d.project_id
WHERE d.updated_at > d.created_at

ORDER BY activity_time DESC;

-- Grant access to views
GRANT SELECT ON public.projects_with_stats TO authenticated;
GRANT SELECT ON public.activity_feed TO authenticated;
