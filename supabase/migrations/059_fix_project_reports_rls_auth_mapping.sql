-- Fix project_reports and storage policies to support auth_user_id mapping
-- Ensures users created outside auth still work after auth linking.

-- =============================================
-- project_reports RLS
-- =============================================

DROP POLICY IF EXISTS "Admins have full access to project_reports" ON public.project_reports;
DROP POLICY IF EXISTS "Clients can view own project reports" ON public.project_reports;
DROP POLICY IF EXISTS "Clients can update view count on own project reports" ON public.project_reports;
DROP POLICY IF EXISTS "Designers can view assigned project reports" ON public.project_reports;

CREATE POLICY "Auth admins have full access to project_reports"
  ON public.project_reports
  FOR ALL
  TO authenticated
  USING (
    public.is_auth_admin()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    public.is_auth_admin()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Auth clients can view own project reports"
  ON public.project_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_reports.project_id
      AND client_id = COALESCE(public.get_user_id_from_auth(), auth.uid())
    )
  );

CREATE POLICY "Auth clients can update view count on own project reports"
  ON public.project_reports
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_reports.project_id
      AND client_id = COALESCE(public.get_user_id_from_auth(), auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = project_reports.project_id
      AND client_id = COALESCE(public.get_user_id_from_auth(), auth.uid())
    )
  );

CREATE POLICY "Auth designers can view assigned project reports"
  ON public.project_reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_designers
      WHERE project_id = project_reports.project_id
      AND user_id = COALESCE(public.get_user_id_from_auth(), auth.uid())
    )
  );

-- =============================================
-- Storage policies for project-reports bucket
-- =============================================

DROP POLICY IF EXISTS "Admins can upload project reports" ON storage.objects;
DROP POLICY IF EXISTS "Project members can read project reports" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete project reports" ON storage.objects;

CREATE POLICY "Auth admins can upload project reports"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'project-reports' AND (
      public.is_auth_admin()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Auth project members can read project reports"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'project-reports' AND
    EXISTS (
      SELECT 1 FROM public.projects p
      LEFT JOIN public.project_designers pd ON pd.project_id = p.id
      WHERE (storage.foldername(name))[1] = p.id::text
      AND (
        p.client_id = COALESCE(public.get_user_id_from_auth(), auth.uid())
        OR pd.user_id = COALESCE(public.get_user_id_from_auth(), auth.uid())
        OR public.is_auth_admin()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Auth admins can delete project reports"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'project-reports' AND (
      public.is_auth_admin()
      OR EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
