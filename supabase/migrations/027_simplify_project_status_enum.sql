-- Migration: Simplify project_status enum from 7 to 5 statuses
-- Remove 'critical' and 'on_track' statuses
-- Migrate: critical -> urgent, on_track -> in_progress

-- Step 1: Update existing projects to new statuses before changing the enum
UPDATE public.projects
SET status = 'urgent'
WHERE status = 'critical';

UPDATE public.projects
SET status = 'in_progress'
WHERE status = 'on_track';

-- Step 2: Update the default value
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'in_progress';

-- Step 3: Drop dependent views
DROP VIEW IF EXISTS public.projects_with_stats CASCADE;
DROP VIEW IF EXISTS public.activity_feed CASCADE;

-- Step 4: Create new enum type with 5 statuses
CREATE TYPE project_status_new AS ENUM (
  'overdue',       -- Past due date
  'urgent',        -- High priority, deadline approaching (includes former 'critical')
  'in_progress',   -- Actively being worked on (includes former 'on_track')
  'review',        -- Awaiting client review/approval
  'done'           -- Completed or archived
);

-- Step 5: Add temporary column and migrate
ALTER TABLE public.projects ADD COLUMN status_temp project_status_new;

UPDATE public.projects SET status_temp = status::text::project_status_new;

-- Step 6: Drop old column and rename new one
ALTER TABLE public.projects DROP COLUMN status;
ALTER TABLE public.projects RENAME COLUMN status_temp TO status;

-- Step 7: Set NOT NULL and default
ALTER TABLE public.projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'in_progress'::project_status_new;

-- Step 8: Drop old enum type and rename new one
DROP TYPE project_status;
ALTER TYPE project_status_new RENAME TO project_status;

-- Step 9: Recreate the index on status
DROP INDEX IF EXISTS idx_projects_status;
CREATE INDEX idx_projects_status ON public.projects(status);

-- Step 10: Update comment
COMMENT ON COLUMN public.projects.status IS 'Project timeline status: overdue, urgent, in_progress, review, done';

-- Step 11: Recreate the views

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

-- Step 12: Grant access to views
GRANT SELECT ON public.projects_with_stats TO authenticated;
GRANT SELECT ON public.activity_feed TO authenticated;

-- Step 13: Update the get_dashboard_metrics function for 5 statuses
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_projects', (SELECT COUNT(*) FROM public.projects),
    'active_projects', (SELECT COUNT(*) FROM public.projects WHERE status IN ('overdue', 'urgent', 'in_progress', 'review')),
    'completed_projects', (SELECT COUNT(*) FROM public.projects WHERE status = 'done'),
    'total_deliverables', (SELECT COUNT(*) FROM public.deliverables),
    'overdue_projects', (SELECT COUNT(*) FROM public.projects p WHERE p.status = 'overdue'),
    'urgent_projects', (SELECT COUNT(*) FROM public.projects p WHERE p.status = 'urgent'),
    'projects_by_status', (
      SELECT jsonb_object_agg(status, cnt)
      FROM (
        SELECT status::text, COUNT(*) as cnt
        FROM public.projects
        GROUP BY status
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;
