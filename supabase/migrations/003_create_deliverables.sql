-- Create enum for deliverable status
CREATE TYPE deliverable_status AS ENUM ('draft', 'in_review', 'approved', 'rejected', 'delivered');

-- Create enum for deliverable type
CREATE TYPE deliverable_type AS ENUM ('image', 'video', 'document', 'archive', 'other');

-- Create deliverables table
CREATE TABLE IF NOT EXISTS public.deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type deliverable_type NOT NULL DEFAULT 'other',
  status deliverable_status NOT NULL DEFAULT 'draft',
  current_version_id UUID,
  miro_frame_id TEXT,
  thumbnail_url TEXT,
  due_date TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create deliverable_versions table
CREATE TABLE IF NOT EXISTS public.deliverable_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by_id UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deliverable_id, version_number)
);

-- Add foreign key for current_version after versions table exists
ALTER TABLE public.deliverables
  ADD CONSTRAINT fk_deliverables_current_version
  FOREIGN KEY (current_version_id)
  REFERENCES public.deliverable_versions(id)
  ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_deliverables_project_id ON public.deliverables(project_id);
CREATE INDEX idx_deliverables_status ON public.deliverables(status);
CREATE INDEX idx_deliverables_type ON public.deliverables(type);
CREATE INDEX idx_deliverables_due_date ON public.deliverables(due_date);
CREATE INDEX idx_deliverable_versions_deliverable_id ON public.deliverable_versions(deliverable_id);
CREATE INDEX idx_deliverable_versions_uploaded_by ON public.deliverable_versions(uploaded_by_id);

-- Enable RLS
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliverable_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deliverables
-- Admins have full access
CREATE POLICY "Admins have full access to deliverables"
  ON public.deliverables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Designers can view and modify deliverables for their projects
CREATE POLICY "Designers can access project deliverables"
  ON public.deliverables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.project_designers pd
      WHERE pd.project_id = deliverables.project_id
      AND pd.user_id = auth.uid()
    )
  );

-- Clients can view deliverables for their projects
CREATE POLICY "Clients can view project deliverables"
  ON public.deliverables
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = deliverables.project_id
      AND p.client_id = auth.uid()
    )
  );

-- Clients can update status (approve/reject)
CREATE POLICY "Clients can update deliverable status"
  ON public.deliverables
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = deliverables.project_id
      AND p.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = deliverables.project_id
      AND p.client_id = auth.uid()
    )
  );

-- RLS Policies for deliverable_versions
-- Admins have full access
CREATE POLICY "Admins have full access to versions"
  ON public.deliverable_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Designers can create and view versions
CREATE POLICY "Designers can manage versions"
  ON public.deliverable_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.project_designers pd ON pd.project_id = d.project_id
      WHERE d.id = deliverable_versions.deliverable_id
      AND pd.user_id = auth.uid()
    )
  );

-- Clients can view versions
CREATE POLICY "Clients can view versions"
  ON public.deliverable_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.deliverables d
      JOIN public.projects p ON p.id = d.project_id
      WHERE d.id = deliverable_versions.deliverable_id
      AND p.client_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_deliverables_updated_at
  BEFORE UPDATE ON public.deliverables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
