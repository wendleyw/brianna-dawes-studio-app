-- Enable realtime for relevant tables
-- Note: Run these after creating the tables

-- Enable realtime for projects
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;

-- Enable realtime for deliverables
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;

-- Enable realtime for deliverable_versions
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverable_versions;

-- Enable realtime for deliverable_feedback
ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverable_feedback;

-- Enable realtime for project_designers
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_designers;

-- Create notification function for project updates
CREATE OR REPLACE FUNCTION public.notify_project_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to project channel
  PERFORM pg_notify(
    'project_' || NEW.id::text,
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create notification function for deliverable updates
CREATE OR REPLACE FUNCTION public.notify_deliverable_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Send notification to project channel
  PERFORM pg_notify(
    'project_' || NEW.project_id::text,
    json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for notifications
CREATE TRIGGER notify_project_changes
  AFTER INSERT OR UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.notify_project_update();

CREATE TRIGGER notify_deliverable_changes
  AFTER INSERT OR UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.notify_deliverable_update();

-- Create function to get realtime subscription token
-- This validates user access before allowing subscription
CREATE OR REPLACE FUNCTION public.get_subscription_token(p_channel TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_project_id UUID;
BEGIN
  -- Extract project_id from channel name (format: project_UUID)
  IF p_channel LIKE 'project_%' THEN
    v_project_id := substring(p_channel from 9)::UUID;
    RETURN public.has_project_access(v_project_id);
  END IF;

  -- Admin can subscribe to any channel
  IF public.is_admin() THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
