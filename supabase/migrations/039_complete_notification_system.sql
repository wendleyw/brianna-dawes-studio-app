-- ============================================================================
-- MIGRATION 039: COMPLETE NOTIFICATION SYSTEM
-- ============================================================================
-- Purpose: Add automatic notifications for all project-related events
-- Notifies: Client + All assigned designers (based on project membership)
-- Events:
--   - Project created (via create_project_with_designers RPC)
--   - Designer assigned to project (via trigger)
--   - Deliverable created (via trigger)
--   - Version uploaded (via trigger on versions JSONB)
-- ============================================================================

-- 1. Trigger: Notificar quando deliverable é criado
CREATE OR REPLACE FUNCTION public.notify_on_deliverable_created()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
BEGIN
  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;

  PERFORM public.notify_project_members(
    NEW.project_id,
    'deliverable_created',
    'New deliverable added',
    format('"%s" was added to "%s"', NEW.name, v_project_name),
    jsonb_build_object(
      'projectId', NEW.project_id,
      'projectName', v_project_name,
      'deliverableId', NEW.id,
      'deliverableName', NEW.name
    ),
    NULL
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_deliverable_created failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_deliverable_created ON public.deliverables;
CREATE TRIGGER trigger_notify_deliverable_created
  AFTER INSERT ON public.deliverables
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_deliverable_created();

-- 2. Trigger: Notificar designer quando atribuído a projeto
CREATE OR REPLACE FUNCTION public.notify_designer_assigned()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
  v_skip_flag TEXT;
BEGIN
  BEGIN
    v_skip_flag := current_setting('app.skip_designer_notifications', true);
  EXCEPTION WHEN OTHERS THEN
    v_skip_flag := '';
  END;

  IF v_skip_flag = '1' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;

  PERFORM public.create_notification(
    NEW.user_id,
    'project_assigned',
    'You were assigned to a project',
    format('You have been assigned to "%s"', v_project_name),
    jsonb_build_object('projectId', NEW.project_id, 'projectName', v_project_name)
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_designer_assigned failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_designer_assigned ON public.project_designers;
CREATE TRIGGER trigger_notify_designer_assigned
  AFTER INSERT ON public.project_designers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_designer_assigned();

-- 3. Trigger: Notificar quando version é uploaded (versions JSONB cresce)
CREATE OR REPLACE FUNCTION public.notify_on_version_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  v_project_name TEXT;
  v_old_count INT;
  v_new_count INT;
  v_latest_version JSONB;
BEGIN
  v_old_count := COALESCE(jsonb_array_length(OLD.versions), 0);
  v_new_count := COALESCE(jsonb_array_length(NEW.versions), 0);

  IF v_new_count > v_old_count THEN
    SELECT name INTO v_project_name FROM public.projects WHERE id = NEW.project_id;
    v_latest_version := NEW.versions->-1;

    PERFORM public.notify_project_members(
      NEW.project_id,
      'version_uploaded',
      'New version uploaded',
      format('Version %s of "%s" was uploaded', v_latest_version->>'version', NEW.name),
      jsonb_build_object(
        'projectId', NEW.project_id,
        'projectName', v_project_name,
        'deliverableId', NEW.id,
        'deliverableName', NEW.name,
        'version', v_latest_version->>'version'
      ),
      (v_latest_version->>'uploaded_by_id')::UUID
    );
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_on_version_uploaded failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_notify_version_uploaded ON public.deliverables;
CREATE TRIGGER trigger_notify_version_uploaded
  AFTER UPDATE OF versions ON public.deliverables
  FOR EACH ROW
  WHEN (OLD.versions IS DISTINCT FROM NEW.versions)
  EXECUTE FUNCTION public.notify_on_version_uploaded();

-- 4. Update create_project_with_designers to notify on project creation
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
  p_briefing JSONB DEFAULT '{}',
  p_google_drive_url TEXT DEFAULT NULL,
  p_due_date_approved BOOLEAN DEFAULT TRUE,
  p_sync_status TEXT DEFAULT NULL,
  p_designer_ids UUID[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_project_id UUID;
  v_designer_id UUID;
BEGIN
  -- Set flag to skip individual designer notifications (we'll notify all at once)
  PERFORM set_config('app.skip_designer_notifications', '1', true);

  -- Insert the project
  INSERT INTO public.projects (
    name, client_id, description, status, priority,
    start_date, due_date, miro_board_id, miro_board_url,
    briefing, google_drive_url, due_date_approved, sync_status
  ) VALUES (
    p_name, p_client_id, p_description, p_status::public.project_status, p_priority::public.project_priority,
    p_start_date, p_due_date, p_miro_board_id, p_miro_board_url,
    p_briefing, p_google_drive_url, p_due_date_approved, p_sync_status::public.miro_sync_status
  ) RETURNING id INTO v_project_id;

  -- Insert designer assignments
  IF p_designer_ids IS NOT NULL AND array_length(p_designer_ids, 1) > 0 THEN
    FOREACH v_designer_id IN ARRAY p_designer_ids LOOP
      INSERT INTO public.project_designers (project_id, user_id)
      VALUES (v_project_id, v_designer_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Notify all project members about the new project
  PERFORM public.notify_project_members(
    v_project_id,
    'project_assigned',
    'New project created',
    format('You have been added to the project "%s"', p_name),
    jsonb_build_object('projectId', v_project_id, 'projectName', p_name),
    NULL -- include everyone (client + designers)
  );

  -- Reset flag
  PERFORM set_config('app.skip_designer_notifications', '', true);

  RETURN v_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- SUMMARY OF NOTIFICATION TRIGGERS
-- ============================================================================
/*
TRIGGERS CREATED:
1. trigger_notify_deliverable_created - Fires on INSERT to deliverables
2. trigger_notify_designer_assigned - Fires on INSERT to project_designers
3. trigger_notify_version_uploaded - Fires on UPDATE of versions column

EXISTING TRIGGERS (from previous migrations):
- notify_on_deliverable_status_change - Fires on deliverable status changes
- notify_project_members_on_project_update - Fires on project status changes

NOTIFICATION RECIPIENTS:
- All notifications use notify_project_members() which sends to:
  * Project client (owner)
  * All assigned designers
  * Excludes the actor who triggered the action (when applicable)
*/
