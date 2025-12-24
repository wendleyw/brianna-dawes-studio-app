-- Migration: Create project_reports table and storage bucket for PDF reports
-- Description: Enables admins to generate and send PDF reports to clients with in-app notifications

-- =============================================
-- FUNCTION: update_updated_at_column
-- =============================================

-- Create the function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TABLE: project_reports
-- =============================================

CREATE TABLE IF NOT EXISTS public.project_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,

  -- Report metadata
  title TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL DEFAULT 'project_summary',

  -- Report data (JSON snapshot of metrics at time of creation)
  report_data JSONB NOT NULL,

  -- PDF storage
  pdf_url TEXT NOT NULL,
  pdf_filename TEXT NOT NULL,
  file_size_bytes INTEGER,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'generated',
  sent_at TIMESTAMPTZ,
  first_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_report_type CHECK (report_type IN ('project_summary', 'milestone', 'final')),
  CONSTRAINT valid_status CHECK (status IN ('generated', 'sent', 'viewed'))
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_project_reports_project_id ON public.project_reports(project_id);
CREATE INDEX idx_project_reports_created_by ON public.project_reports(created_by);
CREATE INDEX idx_project_reports_created_at ON public.project_reports(created_at DESC);
CREATE INDEX idx_project_reports_status ON public.project_reports(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.project_reports ENABLE ROW LEVEL SECURITY;

-- Admins have full access to project_reports
CREATE POLICY "Admins have full access to project_reports"
  ON public.project_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Clients can view reports for their projects
CREATE POLICY "Clients can view own project reports"
  ON public.project_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_reports.project_id
      AND client_id = auth.uid()
    )
  );

-- Clients can update view count on their reports
CREATE POLICY "Clients can update view count on own project reports"
  ON public.project_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_reports.project_id
      AND client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_reports.project_id
      AND client_id = auth.uid()
    )
  );

-- Designers can view reports for assigned projects
CREATE POLICY "Designers can view assigned project reports"
  ON public.project_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_designers
      WHERE project_id = project_reports.project_id
      AND user_id = auth.uid()
    )
  );

-- =============================================
-- REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.project_reports;

-- =============================================
-- TRIGGER: Update updated_at timestamp
-- =============================================

CREATE TRIGGER update_project_reports_updated_at
  BEFORE UPDATE ON public.project_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- STORAGE BUCKET: project-reports
-- =============================================

-- Create storage bucket for project report PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-reports',
  'project-reports',
  false, -- NOT public - requires authentication
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Admins can upload project reports
CREATE POLICY "Admins can upload project reports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-reports' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Project members can read reports
-- Path format: project-reports/{project_id}/{filename}
CREATE POLICY "Project members can read project reports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-reports' AND
    (
      -- Extract project_id from path and check if user has access
      EXISTS (
        SELECT 1 FROM public.projects p
        LEFT JOIN public.project_designers pd ON pd.project_id = p.id
        WHERE (storage.foldername(name))[1] = p.id::text
        AND (
          p.client_id = auth.uid() OR
          pd.user_id = auth.uid() OR
          EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'admin'
          )
        )
      )
    )
  );

-- Admins can delete project reports
CREATE POLICY "Admins can delete project reports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-reports' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE public.project_reports IS 'Stores generated PDF reports for projects that can be sent to clients';
COMMENT ON COLUMN public.project_reports.report_data IS 'JSONB snapshot of project metrics, activity, and deliverables at time of report generation';
COMMENT ON COLUMN public.project_reports.pdf_url IS 'Public URL to the PDF file in Supabase Storage';
COMMENT ON COLUMN public.project_reports.status IS 'Report lifecycle: generated (created), sent (notification sent to client), viewed (client opened)';
