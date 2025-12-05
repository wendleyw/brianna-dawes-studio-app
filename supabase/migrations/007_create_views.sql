-- View for projects with computed fields
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

-- View for deliverables with computed fields
CREATE OR REPLACE VIEW public.deliverables_with_stats AS
SELECT
  d.*,
  (SELECT COUNT(*) FROM public.deliverable_versions v WHERE v.deliverable_id = d.id) as versions_count,
  (SELECT COUNT(*) FROM public.deliverable_feedback f WHERE f.deliverable_id = d.id) as feedback_count,
  (SELECT COUNT(*) FROM public.deliverable_feedback f WHERE f.deliverable_id = d.id AND f.status = 'pending') as pending_feedback_count,
  cv.version_number as current_version_number,
  cv.file_url as current_file_url,
  cv.file_name as current_file_name,
  cv.file_size as current_file_size,
  cv.mime_type as current_mime_type,
  cv.uploaded_by_id as current_uploaded_by_id,
  cu.name as current_uploaded_by_name
FROM public.deliverables d
LEFT JOIN public.deliverable_versions cv ON cv.id = d.current_version_id
LEFT JOIN public.users cu ON cu.id = cv.uploaded_by_id;

-- View for user activity feed
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
GRANT SELECT ON public.deliverables_with_stats TO authenticated;
GRANT SELECT ON public.activity_feed TO authenticated;
