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
