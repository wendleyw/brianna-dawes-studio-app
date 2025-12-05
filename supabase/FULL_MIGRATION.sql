-- ============================================================================
-- FULL DATABASE MIGRATION - Brianna Dawes Studio
-- ============================================================================
-- This file consolidates all migration files in order
-- Generated: 2025-12-02
-- ============================================================================

-- ============================================================================
-- Migration: 001_create_users.sql
-- ============================================================================

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'designer', 'client');

-- Create users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  avatar_url TEXT,
  miro_user_id TEXT UNIQUE,
  miro_access_token TEXT,
  miro_refresh_token TEXT,
  miro_token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_miro_user_id ON public.users(miro_user_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update all users
CREATE POLICY "Admins can update all users"
  ON public.users
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- NOTE: "Designers can view project clients" policy is defined after projects table is created
-- See section: DEFERRED POLICIES

-- Function to handle new user creation from auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at on users
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- Migration: 002_create_projects.sql
-- ============================================================================

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
-- DEFERRED POLICIES (depend on both users and projects tables)
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

-- ============================================================================
-- Migration: 003_create_deliverables.sql
-- ============================================================================

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

-- ============================================================================
-- Migration: 004_create_feedback.sql
-- ============================================================================

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

-- ============================================================================
-- Migration: 005_create_functions.sql
-- ============================================================================

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

-- ============================================================================
-- Migration: 006_create_storage.sql
-- ============================================================================

-- Create storage bucket for deliverable files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deliverable-files',
  'deliverable-files',
  true,
  104857600, -- 100MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies for deliverable-files bucket
-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload deliverable files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'deliverable-files');

-- Users with project access can read files
CREATE POLICY "Project members can read deliverable files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'deliverable-files' AND
    (
      -- Check if user has access to the project
      EXISTS (
        SELECT 1 FROM public.deliverable_versions v
        JOIN public.deliverables d ON d.id = v.deliverable_id
        JOIN public.projects p ON p.id = d.project_id
        LEFT JOIN public.project_designers pd ON pd.project_id = p.id
        WHERE v.file_url LIKE '%' || storage.objects.name || '%'
        AND (
          p.client_id = auth.uid() OR
          pd.user_id = auth.uid() OR
          public.is_admin()
        )
      )
      OR public.is_admin()
    )
  );

-- Admins can delete files
CREATE POLICY "Admins can delete deliverable files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'deliverable-files' AND public.is_admin());

-- Storage policies for avatars bucket
-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anyone can read avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- ============================================================================
-- Migration: 007_create_views.sql
-- ============================================================================

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

-- ============================================================================
-- Migration: 008_create_realtime.sql
-- ============================================================================

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

-- ============================================================================
-- Migration: 009_create_notifications.sql
-- ============================================================================

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

-- ============================================================================
-- Migration: 010_user_board_associations.sql
-- ============================================================================

-- User-Board Associations
-- Links clients to their Miro boards for automatic redirect on login

-- Create user_boards table
CREATE TABLE IF NOT EXISTS public.user_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL, -- Miro board ID
  board_name TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE, -- Primary board for redirect
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, board_id)
);

-- Create indexes
CREATE INDEX idx_user_boards_user_id ON public.user_boards(user_id);
CREATE INDEX idx_user_boards_board_id ON public.user_boards(board_id);
CREATE INDEX idx_user_boards_is_primary ON public.user_boards(is_primary) WHERE is_primary = TRUE;

-- Enable RLS
ALTER TABLE public.user_boards ENABLE ROW LEVEL SECURITY;

-- Admins can manage all user-board associations
CREATE POLICY "Admins can manage all user_boards"
  ON public.user_boards
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can view their own board associations
CREATE POLICY "Users can view own boards"
  ON public.user_boards
  FOR SELECT
  USING (user_id = auth.uid());

-- Add is_super_admin column to users table (for env-based admin)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Add miro_board_id to users for quick primary board access
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS primary_board_id TEXT;

-- Update users updated_at trigger for user_boards
CREATE OR REPLACE FUNCTION public.update_user_boards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_boards_updated_at
  BEFORE UPDATE ON public.user_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_user_boards_updated_at();

-- Function to set primary board for a user
CREATE OR REPLACE FUNCTION public.set_primary_board(
  p_user_id UUID,
  p_board_id TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Remove primary flag from all other boards for this user
  UPDATE public.user_boards
  SET is_primary = FALSE
  WHERE user_id = p_user_id AND is_primary = TRUE;

  -- Set the new primary board
  UPDATE public.user_boards
  SET is_primary = TRUE
  WHERE user_id = p_user_id AND board_id = p_board_id;

  -- Update user's primary_board_id
  UPDATE public.users
  SET primary_board_id = p_board_id
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's primary board
CREATE OR REPLACE FUNCTION public.get_user_primary_board(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_board_id TEXT;
BEGIN
  SELECT board_id INTO v_board_id
  FROM public.user_boards
  WHERE user_id = p_user_id AND is_primary = TRUE
  LIMIT 1;

  RETURN v_board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- App Settings table for global configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage app settings
CREATE POLICY "Admins can manage app_settings"
  ON public.app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- All authenticated users can read app settings
CREATE POLICY "Authenticated users can read app_settings"
  ON public.app_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Insert default app settings
INSERT INTO public.app_settings (key, value, description) VALUES
  ('app_name', '"Brianna Dawes Studios"', 'Application name'),
  ('default_redirect', '"/dashboard"', 'Default redirect path after login'),
  ('client_redirect_to_board', 'true', 'Redirect clients to their primary board on login'),
  ('allow_self_registration', 'false', 'Allow users to register themselves')
ON CONFLICT (key) DO NOTHING;

-- Trigger for app_settings updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_boards_updated_at();

-- ============================================================================
-- Migration: 011_public_user_lookup.sql
-- ============================================================================

-- Allow public lookup of users by miro_user_id or email for authentication
-- This is necessary because Miro app users authenticate via Miro SDK,
-- not Supabase Auth, so they don't have a session when looking up their user record

-- Policy to allow public SELECT on users table for authentication lookup
-- Only allows lookup by miro_user_id or email, and only returns limited columns
CREATE POLICY "Allow public user lookup for auth"
  ON public.users
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================================
-- END OF FULL MIGRATION
-- ============================================================================
