-- Migration: Notify project members on project status/flags changes
-- Purpose: Ensure notifications work from any UI/context by moving logic server-side.

CREATE OR REPLACE FUNCTION public.update_project_with_designers(
  p_project_id UUID,
  p_update_designers BOOLEAN DEFAULT FALSE,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_client_id UUID DEFAULT NULL,
  p_miro_board_id TEXT DEFAULT NULL,
  p_miro_board_url TEXT DEFAULT NULL,
  p_briefing JSONB DEFAULT NULL,
  p_google_drive_url TEXT DEFAULT NULL,
  p_was_reviewed BOOLEAN DEFAULT NULL,
  p_was_approved BOOLEAN DEFAULT NULL,
  p_requested_due_date TIMESTAMPTZ DEFAULT NULL,
  p_due_date_requested_at TIMESTAMPTZ DEFAULT NULL,
  p_due_date_requested_by UUID DEFAULT NULL,
  p_due_date_approved BOOLEAN DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL,
  p_designer_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_designer_id UUID;

  v_old_status project_status;
  v_old_was_reviewed BOOLEAN;
  v_old_was_approved BOOLEAN;
  v_old_name TEXT;

  v_new_status project_status;
  v_new_was_reviewed BOOLEAN;
  v_new_was_approved BOOLEAN;
  v_new_name TEXT;

  v_actor_id UUID;
BEGIN
  v_actor_id := auth.uid();

  SELECT status, was_reviewed, was_approved, name
  INTO v_old_status, v_old_was_reviewed, v_old_was_approved, v_old_name
  FROM projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found: %', p_project_id;
  END IF;

  -- Update project fields (only non-null values)
  UPDATE projects SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status::project_status, status),
    priority = COALESCE(p_priority::project_priority, priority),
    start_date = COALESCE(p_start_date, start_date),
    due_date = COALESCE(p_due_date, due_date),
    client_id = COALESCE(p_client_id, client_id),
    miro_board_id = COALESCE(p_miro_board_id, miro_board_id),
    miro_board_url = COALESCE(p_miro_board_url, miro_board_url),
    briefing = COALESCE(p_briefing, briefing),
    google_drive_url = COALESCE(p_google_drive_url, google_drive_url),
    was_reviewed = COALESCE(p_was_reviewed, was_reviewed),
    was_approved = COALESCE(p_was_approved, was_approved),
    requested_due_date = COALESCE(p_requested_due_date, requested_due_date),
    due_date_requested_at = COALESCE(p_due_date_requested_at, due_date_requested_at),
    due_date_requested_by = COALESCE(p_due_date_requested_by, due_date_requested_by),
    due_date_approved = COALESCE(p_due_date_approved, due_date_approved),
    thumbnail_url = COALESCE(p_thumbnail_url, thumbnail_url),
    updated_at = NOW()
  WHERE id = p_project_id;

  -- Update designers if flag is set
  IF p_update_designers = TRUE THEN
    -- Delete existing designers
    DELETE FROM project_designers WHERE project_id = p_project_id;

    -- Insert new designers if provided
    IF p_designer_ids IS NOT NULL AND array_length(p_designer_ids, 1) > 0 THEN
      FOREACH v_designer_id IN ARRAY p_designer_ids
      LOOP
        INSERT INTO project_designers (project_id, user_id)
        VALUES (p_project_id, v_designer_id);
      END LOOP;
    END IF;
  END IF;

  -- Fetch updated state for notification logic
  SELECT status, was_reviewed, was_approved, name
  INTO v_new_status, v_new_was_reviewed, v_new_was_approved, v_new_name
  FROM projects
  WHERE id = p_project_id;

  -- Notify members (best-effort, don't fail the update if notification fails)
  BEGIN
    -- Client requested changes (reviewed -> send back to in_progress)
    IF v_new_was_reviewed IS DISTINCT FROM v_old_was_reviewed
      AND v_new_was_reviewed = TRUE
      AND v_new_status = 'in_progress' THEN
      PERFORM public.notify_project_members(
        p_project_id,
        'status_changed',
        'Changes requested',
        format('Changes requested for "%s".', v_new_name),
        jsonb_build_object(
          'projectId', p_project_id,
          'projectName', v_new_name,
          'action', 'changes_requested'
        ),
        v_actor_id
      );
    END IF;

    -- Status transitions
    IF v_new_status IS DISTINCT FROM v_old_status THEN
      IF v_new_status = 'review' THEN
        PERFORM public.notify_project_members(
          p_project_id,
          'status_changed',
          'Review ready',
          format('"%s" is ready for your review.', v_new_name),
          jsonb_build_object(
            'projectId', p_project_id,
            'projectName', v_new_name,
            'status', 'review'
          ),
          v_actor_id
        );
      ELSIF v_new_status = 'done' THEN
        PERFORM public.notify_project_members(
          p_project_id,
          'status_changed',
          'Project completed',
          format('"%s" was marked as completed.', v_new_name),
          jsonb_build_object(
            'projectId', p_project_id,
            'projectName', v_new_name,
            'status', 'done'
          ),
          v_actor_id
        );
      ELSIF v_new_status = 'urgent' OR v_new_status = 'overdue' THEN
        PERFORM public.notify_project_members(
          p_project_id,
          'status_changed',
          'Status updated',
          format('"%s" moved to %s.', v_new_name, replace(v_new_status::text, '_', ' ')),
          jsonb_build_object(
            'projectId', p_project_id,
            'projectName', v_new_name,
            'status', v_new_status::text
          ),
          v_actor_id
        );
      END IF;
    END IF;

    -- Client approved (was_approved: false -> true)
    IF v_new_was_approved IS DISTINCT FROM v_old_was_approved AND v_new_was_approved = TRUE THEN
      PERFORM public.notify_project_members(
        p_project_id,
        'status_changed',
        'Client approved',
        format('Client approved "%s".', v_new_name),
        jsonb_build_object(
          'projectId', p_project_id,
          'projectName', v_new_name,
          'action', 'client_approved'
        ),
        v_actor_id
      );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      -- Best effort: ignore notification failures
      NULL;
  END;

  RETURN p_project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_project_with_designers TO authenticated;

