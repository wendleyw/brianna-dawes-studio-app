-- Keep `deliverables.versions` (JSONB) in sync when inserting into `deliverable_versions` (relational source).
-- This enables a safe migration path where the app can switch to table writes while legacy reads/triggers still rely on JSONB.

begin;

CREATE OR REPLACE FUNCTION public.bridge_versions_table_to_jsonb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
  v_version_obj jsonb;
  v_user_name text;
  v_user_avatar text;
BEGIN
  -- Ensure deliverables.versions exists
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'deliverables'
      AND column_name = 'versions'
  ) THEN
    RETURN NEW;
  END IF;

  -- Check if version already present in JSONB (avoid duplicates / trigger loops)
  SELECT EXISTS (
    SELECT 1
    FROM public.deliverables d,
         LATERAL jsonb_array_elements(d.versions) elem
    WHERE d.id = NEW.deliverable_id
      AND elem->>'id' = NEW.id::text
  ) INTO v_exists;

  IF v_exists THEN
    RETURN NEW;
  END IF;

  -- Best-effort user hydration (optional)
  SELECT u.name, u.avatar_url
  INTO v_user_name, v_user_avatar
  FROM public.users u
  WHERE u.id = NEW.uploaded_by_id;

  v_version_obj := jsonb_build_object(
    'id', NEW.id,
    'version', NEW.version_number,
    'file_url', NEW.file_url,
    'file_name', NEW.file_name,
    'file_size', NEW.file_size,
    'mime_type', NEW.mime_type,
    'uploaded_by_id', NEW.uploaded_by_id,
    'uploaded_by_name', COALESCE(v_user_name, ''),
    'uploaded_by_avatar', v_user_avatar,
    'comment', NEW.comment,
    'created_at', NEW.created_at
  );

  UPDATE public.deliverables
  SET versions = COALESCE(versions, '[]'::jsonb) || jsonb_build_array(v_version_obj),
      current_version_id = NEW.id,
      updated_at = now()
  WHERE id = NEW.deliverable_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bridge_versions_table_to_jsonb failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bridge_versions_table_to_jsonb ON public.deliverable_versions;
CREATE TRIGGER trigger_bridge_versions_table_to_jsonb
  AFTER INSERT ON public.deliverable_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.bridge_versions_table_to_jsonb();

commit;

