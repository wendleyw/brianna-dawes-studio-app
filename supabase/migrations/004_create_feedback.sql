-- Create enum for feedback status
CREATE TYPE feedback_status AS ENUM ('pending', 'resolved');

-- Create deliverable_feedback table
CREATE TABLE IF NOT EXISTS public.deliverable_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.deliverable_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status feedback_status NOT NULL DEFAULT 'pending',
  miro_annotation_id TEXT,
  position JSONB, -- {x: number, y: number} for annotation position
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_feedback_deliverable_id ON public.deliverable_feedback(deliverable_id);
CREATE INDEX idx_feedback_version_id ON public.deliverable_feedback(version_id);
CREATE INDEX idx_feedback_user_id ON public.deliverable_feedback(user_id);
CREATE INDEX idx_feedback_status ON public.deliverable_feedback(status);

-- Enable RLS
ALTER TABLE public.deliverable_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deliverable_feedback
-- Admins have full access
CREATE POLICY "Admins have full access to feedback"
  ON public.deliverable_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Designers can view and respond to feedback on their projects
CREATE POLICY "Designers can access project feedback"
  ON public.deliverable_feedback
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.project_designers pd ON pd.project_id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id
      AND pd.user_id = auth.uid()
    )
  );

-- Clients can create and view feedback on their projects
CREATE POLICY "Clients can create feedback"
  ON public.deliverable_feedback
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id
      AND p.client_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view feedback"
  ON public.deliverable_feedback
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deliverable_feedback.deliverable_id
      AND p.client_id = auth.uid()
    )
  );

-- Users can update their own feedback
CREATE POLICY "Users can update own feedback"
  ON public.deliverable_feedback
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.deliverable_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
