-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- System can insert notifications (via functions)
CREATE POLICY "System can insert notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to create a notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}'
)
RETURNS public.notifications AS $$
DECLARE
  v_notification public.notifications;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (p_user_id, p_type, p_title, p_message, p_data)
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify project members
CREATE OR REPLACE FUNCTION public.notify_project_members(
  p_project_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS SETOF public.notifications AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Notify client
  SELECT client_id INTO v_user_id FROM public.projects WHERE id = p_project_id;
  IF v_user_id IS NOT NULL AND v_user_id != COALESCE(p_exclude_user_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
    RETURN NEXT public.create_notification(v_user_id, p_type, p_title, p_message, p_data);
  END IF;

  -- Notify designers
  FOR v_user_id IN
    SELECT user_id FROM public.project_designers WHERE project_id = p_project_id
  LOOP
    IF v_user_id != COALESCE(p_exclude_user_id, '00000000-0000-0000-0000-000000000000'::UUID) THEN
      RETURN NEXT public.create_notification(v_user_id, p_type, p_title, p_message, p_data);
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to notify on deliverable status change
CREATE OR REPLACE FUNCTION public.notify_deliverable_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_project_name TEXT;
BEGIN
  IF OLD.status != NEW.status THEN
    SELECT p.id, p.name INTO v_project_id, v_project_name
    FROM public.projects p
    WHERE p.id = NEW.project_id;

    PERFORM public.notify_project_members(
      v_project_id,
      'status_changed',
      'Status Updated',
      format('Deliverable "%s" was updated to %s', NEW.name, NEW.status),
      jsonb_build_object(
        'projectId', v_project_id,
        'projectName', v_project_name,
        'deliverableId', NEW.id,
        'deliverableName', NEW.name,
        'newStatus', NEW.status,
        'oldStatus', OLD.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_deliverable_status_change
  AFTER UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.notify_deliverable_status_change();

-- Trigger to notify on new feedback
CREATE OR REPLACE FUNCTION public.notify_new_feedback()
RETURNS TRIGGER AS $$
DECLARE
  v_deliverable RECORD;
  v_project RECORD;
  v_user RECORD;
BEGIN
  SELECT * INTO v_deliverable FROM public.deliverables WHERE id = NEW.deliverable_id;
  SELECT * INTO v_project FROM public.projects WHERE id = v_deliverable.project_id;
  SELECT * INTO v_user FROM public.users WHERE id = NEW.user_id;

  PERFORM public.notify_project_members(
    v_project.id,
    'feedback_received',
    'New Feedback',
    format('%s commented on "%s"', v_user.name, v_deliverable.name),
    jsonb_build_object(
      'projectId', v_project.id,
      'projectName', v_project.name,
      'deliverableId', v_deliverable.id,
      'deliverableName', v_deliverable.name,
      'actorId', v_user.id,
      'actorName', v_user.name
    ),
    NEW.user_id -- Exclude the user who created the feedback
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER notify_on_new_feedback
  AFTER INSERT ON public.deliverable_feedback
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_feedback();
