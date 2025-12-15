-- Fix get_dashboard_metrics() to work with the current auth-linking model.
--
-- The app now links auth.users ↔ public.users via public.users.auth_user_id
-- (see migration 035_link_auth_users.sql). That means auth.uid() is NOT
-- necessarily equal to public.users.id.
--
-- This function must therefore resolve the current user's public.users.id via
-- public.get_user_id_from_auth(), and only fall back to auth.uid() for legacy
-- installs where public.users.id still equals auth.users.id.

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
  -- If there's no authenticated user, return empty metrics.
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, '[]'::jsonb;
    RETURN;
  END IF;

  -- Resolve current user's public.users.id from auth.uid() when using auth_user_id linking.
  -- Fallback to auth.uid() for legacy installs where public.users.id == auth.users.id.
  v_user_id := COALESCE(public.get_user_id_from_auth(), auth.uid());

  SELECT role INTO v_user_role
  FROM public.users
  WHERE id = v_user_id
  LIMIT 1;

  IF v_user_role IS NULL THEN
    RETURN QUERY SELECT 0::BIGINT, 0::BIGINT, 0::BIGINT, '[]'::jsonb;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.projects p
     WHERE p.status IN ('critical', 'overdue', 'urgent', 'on_track', 'in_progress', 'review') AND (
       p.client_id = v_user_id OR
       EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
       v_user_role = 'admin'
     ))::BIGINT as active_projects,

    (SELECT COUNT(*) FROM public.deliverables d
     JOIN public.projects p ON p.id = d.project_id
     WHERE d.status = 'in_review' AND (
       p.client_id = v_user_id OR
       EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
       v_user_role = 'admin'
     ))::BIGINT as pending_reviews,

    (SELECT COUNT(*) FROM public.deliverables d
     JOIN public.projects p ON p.id = d.project_id
     WHERE d.due_date < NOW() AND d.status NOT IN ('delivered', 'approved') AND (
       p.client_id = v_user_id OR
       EXISTS (SELECT 1 FROM public.project_designers pd WHERE pd.project_id = p.id AND pd.user_id = v_user_id) OR
       v_user_role = 'admin'
     ))::BIGINT as overdue_deliverables,

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

COMMENT ON FUNCTION public.get_dashboard_metrics() IS
  'Returns dashboard metrics for the current user; resolves public.users.id via auth_user_id mapping (get_user_id_from_auth), with legacy fallback to auth.uid().';

