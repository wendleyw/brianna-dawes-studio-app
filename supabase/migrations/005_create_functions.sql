-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user is designer
CREATE OR REPLACE FUNCTION public.is_designer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'designer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user has access to project
CREATE OR REPLACE FUNCTION public.has_project_access(project_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    LEFT JOIN public.project_designers pd ON p.id = pd.project_id
    WHERE p.id = project_id AND (
      p.client_id = auth.uid() OR
      pd.user_id = auth.uid() OR
      public.is_admin()
    )
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get project statistics
CREATE OR REPLACE FUNCTION public.get_project_stats(p_project_id UUID)
RETURNS TABLE (
  total_deliverables BIGINT,
  pending_deliverables BIGINT,
  approved_deliverables BIGINT,
  rejected_deliverables BIGINT,
  delivered_deliverables BIGINT,
  total_feedback BIGINT,
  pending_feedback BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(d.id) as total_deliverables,
    COUNT(d.id) FILTER (WHERE d.status IN ('draft', 'in_review')) as pending_deliverables,
    COUNT(d.id) FILTER (WHERE d.status = 'approved') as approved_deliverables,
    COUNT(d.id) FILTER (WHERE d.status = 'rejected') as rejected_deliverables,
    COUNT(d.id) FILTER (WHERE d.status = 'delivered') as delivered_deliverables,
    (SELECT COUNT(*) FROM public.deliverable_feedback f
     WHERE f.deliverable_id IN (SELECT id FROM public.deliverables WHERE project_id = p_project_id)) as total_feedback,
    (SELECT COUNT(*) FROM public.deliverable_feedback f
     WHERE f.deliverable_id IN (SELECT id FROM public.deliverables WHERE project_id = p_project_id)
     AND f.status = 'pending') as pending_feedback
  FROM public.deliverables d
  WHERE d.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get deliverable with version count
CREATE OR REPLACE FUNCTION public.get_deliverable_with_counts(d_id UUID)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  name TEXT,
  description TEXT,
  type deliverable_type,
  status deliverable_status,
  versions_count BIGINT,
  feedback_count BIGINT,
  current_version_id UUID,
  miro_frame_id TEXT,
  thumbnail_url TEXT,
  due_date TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.project_id,
    d.name,
    d.description,
    d.type,
    d.status,
    (SELECT COUNT(*) FROM public.deliverable_versions v WHERE v.deliverable_id = d.id) as versions_count,
    (SELECT COUNT(*) FROM public.deliverable_feedback f WHERE f.deliverable_id = d.id) as feedback_count,
    d.current_version_id,
    d.miro_frame_id,
    d.thumbnail_url,
    d.due_date,
    d.delivered_at,
    d.created_at,
    d.updated_at
  FROM public.deliverables d
  WHERE d.id = d_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update deliverable status with validation
CREATE OR REPLACE FUNCTION public.update_deliverable_status(
  p_deliverable_id UUID,
  p_new_status deliverable_status
)
RETURNS public.deliverables AS $$
DECLARE
  v_deliverable public.deliverables;
  v_user_role user_role;
BEGIN
  -- Get user role
  SELECT role INTO v_user_role FROM public.users WHERE id = auth.uid();

  -- Get deliverable
  SELECT * INTO v_deliverable FROM public.deliverables WHERE id = p_deliverable_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deliverable not found';
  END IF;

  -- Validate status transitions
  -- Clients can only approve or reject items in_review
  IF v_user_role = 'client' THEN
    IF v_deliverable.status != 'in_review' THEN
      RAISE EXCEPTION 'Clients can only change status of items in review';
    END IF;
    IF p_new_status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Clients can only approve or reject deliverables';
    END IF;
  END IF;

  -- Update status
  UPDATE public.deliverables
  SET
    status = p_new_status,
    delivered_at = CASE WHEN p_new_status = 'delivered' THEN NOW() ELSE delivered_at END,
    updated_at = NOW()
  WHERE id = p_deliverable_id
  RETURNING * INTO v_deliverable;

  RETURN v_deliverable;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get dashboard metrics for a user
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
    -- Active projects count
    (SELECT COUNT(*) FROM public.projects p
     WHERE p.status = 'active' AND (
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
