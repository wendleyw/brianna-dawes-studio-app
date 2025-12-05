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
