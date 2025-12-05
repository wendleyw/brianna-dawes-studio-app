-- Create enum for project status
CREATE TYPE project_status AS ENUM ('active', 'on_hold', 'completed', 'archived');

-- Create enum for project priority
CREATE TYPE project_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  priority project_priority NOT NULL DEFAULT 'medium',
  start_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  miro_board_id TEXT,
  miro_board_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_projects_client_id ON public.projects(client_id);
CREATE INDEX idx_projects_status ON public.projects(status);
CREATE INDEX idx_projects_priority ON public.projects(priority);
CREATE INDEX idx_projects_due_date ON public.projects(due_date);
CREATE INDEX idx_projects_miro_board_id ON public.projects(miro_board_id);

-- Create project_designers junction table
CREATE TABLE IF NOT EXISTS public.project_designers (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Create indexes for junction table
CREATE INDEX idx_project_designers_user_id ON public.project_designers(user_id);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_designers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects table
-- Admins can do everything
CREATE POLICY "Admins have full access to projects"
  ON public.projects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Designers can view and update projects they're assigned to
CREATE POLICY "Designers can view assigned projects"
  ON public.projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_designers
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Designers can update assigned projects"
  ON public.projects
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_designers
      WHERE project_id = projects.id AND user_id = auth.uid()
    )
  );

-- Clients can view their own projects
CREATE POLICY "Clients can view own projects"
  ON public.projects
  FOR SELECT
  USING (client_id = auth.uid());

-- RLS Policies for project_designers
-- Admins have full access
CREATE POLICY "Admins have full access to project_designers"
  ON public.project_designers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Designers can view their own assignments
CREATE POLICY "Designers can view own assignments"
  ON public.project_designers
  FOR SELECT
  USING (user_id = auth.uid());

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- DEFERRED POLICY from 001_create_users.sql
-- This policy depends on both users and projects tables
-- ============================================================================

-- Designers can view clients assigned to their projects
-- Note: auth.uid() IS NOT NULL prevents this from being evaluated for anon users
CREATE POLICY "Designers can view project clients"
  ON public.users
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    role = 'client' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.project_designers pd ON p.id = pd.project_id
      WHERE pd.user_id = auth.uid() AND p.client_id = users.id
    )
  );
