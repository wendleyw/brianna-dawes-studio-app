-- Migration: Fix get_dashboard_metrics() to use correct project status enum
-- The function was using old 'active' status which no longer exists
-- New enum values: critical, overdue, urgent, on_track, in_progress, review, done

-- Drop and recreate the function
DROP FUNCTION IF EXISTS public.get_dashboard_metrics();

CREATE OR REPLACE FUNCTION public.get_dashboard_metrics()
RETURNS TABLE (
  active_projects BIGINT,
  pending_reviews BIGINT,
  overdue_deliverables BIGINT,
  recent_activity JSONB
) AS $$
DECLARE
  v_user_role user_role;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  SELECT role INTO v_user_role FROM public.users WHERE id = v_user_id;

  RETURN QUERY
  SELECT
    -- Active projects count (now using new statuses that represent active work)
    -- active = critical, overdue, urgent, on_track, in_progress, review
    (SELECT COUNT(*) FROM public.projects p
     WHERE p.status IN ('critical', 'overdue', 'urgent', 'on_track', 'in_progress', 'review') AND (
       p.client_id = v_user_id OR
       EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
       v_user_role = 'admin'
     ))::BIGINT as active_projects,

    -- Pending reviews count
    (SELECT COUNT(*) FROM public.deliverables d
     JOIN public.projects p ON p.id = d.project_id
     WHERE d.status = 'in_review' AND (
       p.client_id = v_user_id OR
       EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
       v_user_role = 'admin'
     ))::BIGINT as pending_reviews,

    -- Overdue deliverables count
    (SELECT COUNT(*) FROM public.deliverables d
     JOIN public.projects p ON p.id = d.project_id
     WHERE d.due_date < NOW() AND d.status NOT IN ('delivered', 'approved') AND (
       p.client_id = v_user_id OR
       EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
       v_user_role = 'admin'
     ))::BIGINT as overdue_deliverables,

    -- Recent activity (last 10 items)
    (SELECT COALESCE(jsonb_agg(activity ORDER BY activity_time DESC), '[]'::jsonb)
     FROM (
       SELECT
         'deliverable_created' as activity_type,
         d.name as item_name,
         p.name as project_name,
         d.created_at as activity_time
       FROM public.deliverables d
       JOIN public.projects p ON p.id = d.project_id
       WHERE (
         p.client_id = v_user_id OR
         EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
         v_user_role = 'admin'
       )
       ORDER BY d.created_at DESC
       LIMIT 10
     ) activity) as recent_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment documenting the fix
COMMENT ON FUNCTION public.get_dashboard_metrics() IS
  'Returns dashboard metrics for the current user. Fixed in migration 026 to use new 7-status enum (critical, overdue, urgent, on_track, in_progress, review, done) instead of old active status.';
