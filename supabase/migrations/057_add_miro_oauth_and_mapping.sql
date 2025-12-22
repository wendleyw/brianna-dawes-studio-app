-- Miro OAuth + item mapping for bidirectional sync
-- Adds token storage, OAuth state tracking, item mapping, and sync source timestamps.

begin;

-- 1) Sync job types: add inbound Miro item sync job type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'sync_job_type' AND e.enumlabel = 'miro_item_sync'
  ) THEN
    ALTER TYPE public.sync_job_type ADD VALUE 'miro_item_sync';
  END IF;
END $$;

-- 2) OAuth token storage (encrypted at app layer)
CREATE TABLE IF NOT EXISTS public.miro_oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  board_id text,
  miro_user_id text,
  team_id text,
  access_token_encrypted text NOT NULL,
  refresh_token_encrypted text,
  token_type text,
  scope text,
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_miro_oauth_tokens_board_id
  ON public.miro_oauth_tokens(board_id)
  WHERE board_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_miro_oauth_tokens_user_id
  ON public.miro_oauth_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_miro_oauth_tokens_miro_user_id
  ON public.miro_oauth_tokens(miro_user_id);

ALTER TABLE public.miro_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- No RLS policies: tokens should be accessed only by service role (edge functions).

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_miro_oauth_tokens_updated_at ON public.miro_oauth_tokens;
CREATE TRIGGER update_miro_oauth_tokens_updated_at
  BEFORE UPDATE ON public.miro_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3) OAuth state tracking
CREATE TABLE IF NOT EXISTS public.miro_oauth_states (
  state text PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  board_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_miro_oauth_states_expires_at
  ON public.miro_oauth_states(expires_at);

ALTER TABLE public.miro_oauth_states ENABLE ROW LEVEL SECURITY;

-- No RLS policies: handled by service role.

-- 4) Miro item mapping (project ⇄ Miro items)
CREATE TABLE IF NOT EXISTS public.miro_item_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id text NOT NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  miro_item_id text NOT NULL,
  field_key text,
  version_number int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_miro_item_map_board_item
  ON public.miro_item_map(board_id, miro_item_id);

CREATE INDEX IF NOT EXISTS idx_miro_item_map_project
  ON public.miro_item_map(project_id);

CREATE INDEX IF NOT EXISTS idx_miro_item_map_item_type
  ON public.miro_item_map(item_type);

ALTER TABLE public.miro_item_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage miro_item_map" ON public.miro_item_map;
CREATE POLICY "Admins can manage miro_item_map"
  ON public.miro_item_map
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_miro_item_map_updated_at ON public.miro_item_map;
CREATE TRIGGER update_miro_item_map_updated_at
  BEFORE UPDATE ON public.miro_item_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5) Sync source tracking on projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS last_miro_inbound_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_miro_outbound_at timestamptz;

-- 6) Helper: check if a board has a stored Miro connection
CREATE OR REPLACE FUNCTION public.has_miro_connection(p_board_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.miro_oauth_tokens t
    WHERE t.board_id = p_board_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_miro_connection(text) TO authenticated;

-- 7) Helper: upsert mapping (client-safe with RBAC + board check)
CREATE OR REPLACE FUNCTION public.upsert_miro_item_map(
  p_board_id text,
  p_project_id uuid,
  p_item_type text,
  p_miro_item_id text,
  p_field_key text DEFAULT NULL,
  p_version_number int DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_board text;
  v_id uuid;
BEGIN
  SELECT miro_board_id INTO v_project_board
  FROM public.projects
  WHERE id = p_project_id;

  IF v_project_board IS NULL OR v_project_board <> p_board_id THEN
    RAISE EXCEPTION 'board_mismatch';
  END IF;

  IF NOT public.has_project_access(p_project_id) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  INSERT INTO public.miro_item_map (board_id, project_id, item_type, miro_item_id, field_key, version_number)
  VALUES (p_board_id, p_project_id, p_item_type, p_miro_item_id, p_field_key, p_version_number)
  ON CONFLICT (board_id, miro_item_id)
  DO UPDATE SET
    project_id = EXCLUDED.project_id,
    item_type = EXCLUDED.item_type,
    field_key = EXCLUDED.field_key,
    version_number = EXCLUDED.version_number,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_miro_item_map(text, uuid, text, text, text, int) TO authenticated;

commit;
