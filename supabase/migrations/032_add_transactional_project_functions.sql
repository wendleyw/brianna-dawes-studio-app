-- Migration: Add transactional functions for project operations
-- These functions wrap multiple operations in a single transaction
-- to ensure atomicity (all-or-nothing behavior)

-- ============================================================================
-- FUNCTION: create_project_with_designers
-- Creates a project AND assigns designers in a single transaction
-- If designer assignment fails, the project creation is rolled back
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_project_with_designers(
  p_name TEXT,
  p_client_id UUID,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'in_progress',
  p_priority TEXT DEFAULT 'medium',
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_due_date TIMESTAMPTZ DEFAULT NULL,
  p_miro_board_id TEXT DEFAULT NULL,
  p_miro_board_url TEXT DEFAULT NULL,
  p_briefing JSONB DEFAULT '{}'::JSONB,
  p_google_drive_url TEXT DEFAULT NULL,
  p_due_date_approved BOOLEAN DEFAULT TRUE,
  p_sync_status TEXT DEFAULT NULL,
  p_designer_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_sync_status TEXT;
  v_designer_id UUID;
BEGIN
  -- Determine sync status
  v_sync_status := COALESCE(p_sync_status,
    CASE WHEN p_miro_board_id IS NULL THEN 'not_required' ELSE 'pending' END
  );

  -- Insert the project
  INSERT INTO projects (
    name,
    description,
    status,
    priority,
    start_date,
    due_date,
    client_id,
    miro_board_id,
    miro_board_url,
    briefing,
    google_drive_url,
    due_date_approved,
    sync_status
  ) VALUES (
    p_name,
    p_description,
    p_status::project_status,
    p_priority::project_priority,
    p_start_date,
    p_due_date,
    p_client_id,
    p_miro_board_id,
    p_miro_board_url,
    p_briefing,
    p_google_drive_url,
    p_due_date_approved,
    v_sync_status::miro_sync_status
  )
  RETURNING id INTO v_project_id;

  -- Insert designers if provided
  IF array_length(p_designer_ids, 1) > 0 THEN
    FOREACH v_designer_id IN ARRAY p_designer_ids
    LOOP
      INSERT INTO project_designers (project_id, user_id)
      VALUES (v_project_id, v_designer_id);
    END LOOP;
  END IF;

  -- Return the new project ID
  RETURN v_project_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error (optional: you could insert into an error log table)
    RAISE EXCEPTION 'Failed to create project: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_project_with_designers TO authenticated;

COMMENT ON FUNCTION public.create_project_with_designers IS
  'Creates a project with optional designer assignments in a single atomic transaction.
   If any step fails, the entire operation is rolled back.';

-- ============================================================================
-- FUNCTION: update_project_designers
-- Updates project designers in a single transaction (delete + insert)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_project_designers(
  p_project_id UUID,
  p_designer_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_designer_id UUID;
BEGIN
  -- Delete existing designers
  DELETE FROM project_designers WHERE project_id = p_project_id;

  -- Insert new designers if provided
  IF array_length(p_designer_ids, 1) > 0 THEN
    FOREACH v_designer_id IN ARRAY p_designer_ids
    LOOP
      INSERT INTO project_designers (project_id, user_id)
      VALUES (p_project_id, v_designer_id);
    END LOOP;
  END IF;

  -- Update the project's updated_at timestamp
  UPDATE projects SET updated_at = NOW() WHERE id = p_project_id;

  RETURN TRUE;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update project designers: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_project_designers TO authenticated;

COMMENT ON FUNCTION public.update_project_designers IS
  'Updates project designer assignments atomically. Deletes all existing
   assignments and inserts new ones in a single transaction.';

-- ============================================================================
-- FUNCTION: update_project_with_designers
-- Full project update with optional designer changes in a single transaction
-- ============================================================================

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
BEGIN
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

  RETURN p_project_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update project: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_project_with_designers TO authenticated;

COMMENT ON FUNCTION public.update_project_with_designers IS
  'Updates a project with optional designer changes in a single atomic transaction.
   Only non-null parameters will update their respective fields.
   Set p_update_designers=TRUE to update designer assignments.';
