-- Migration: Add sync_status to projects table
-- Purpose: Track synchronization state between Supabase and Miro boards
-- This enables:
--   1. Detecting failed syncs
--   2. Retry mechanisms
--   3. Sync health monitoring dashboard
--   4. Better error recovery

-- Create enum type for sync status
DO $$ BEGIN
  CREATE TYPE miro_sync_status AS ENUM (
    'pending',      -- Project created, waiting for Miro sync
    'syncing',      -- Currently syncing to Miro
    'synced',       -- Successfully synced with Miro
    'sync_error',   -- Sync failed, needs retry
    'not_required'  -- Project doesn't need Miro sync (e.g., draft)
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add sync columns to projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS sync_status miro_sync_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sync_error_message TEXT,
ADD COLUMN IF NOT EXISTS sync_retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS miro_card_id TEXT,
ADD COLUMN IF NOT EXISTS miro_frame_id TEXT;

-- Create index for querying projects by sync status
CREATE INDEX IF NOT EXISTS idx_projects_sync_status ON projects(sync_status);

-- Create index for finding projects that need retry
CREATE INDEX IF NOT EXISTS idx_projects_sync_retry
ON projects(sync_status, sync_retry_count)
WHERE sync_status = 'sync_error';

-- Update existing projects to 'synced' if they have miro_board_id
-- (they were already working before this migration)
UPDATE projects
SET sync_status = 'synced',
    last_synced_at = updated_at
WHERE miro_board_id IS NOT NULL
  AND sync_status = 'pending';

-- Update projects without miro_board_id to 'not_required'
UPDATE projects
SET sync_status = 'not_required'
WHERE miro_board_id IS NULL
  AND sync_status = 'pending';

-- Create function to get sync health metrics
CREATE OR REPLACE FUNCTION get_sync_health_metrics()
RETURNS TABLE (
  total_projects BIGINT,
  synced_count BIGINT,
  pending_count BIGINT,
  error_count BIGINT,
  syncing_count BIGINT,
  sync_success_rate NUMERIC,
  avg_retry_count NUMERIC,
  last_sync_error TEXT,
  last_error_project_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_projects,
    COUNT(*) FILTER (WHERE p.sync_status = 'synced')::BIGINT as synced_count,
    COUNT(*) FILTER (WHERE p.sync_status = 'pending')::BIGINT as pending_count,
    COUNT(*) FILTER (WHERE p.sync_status = 'sync_error')::BIGINT as error_count,
    COUNT(*) FILTER (WHERE p.sync_status = 'syncing')::BIGINT as syncing_count,
    CASE
      WHEN COUNT(*) FILTER (WHERE p.sync_status != 'not_required') > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE p.sync_status = 'synced')::NUMERIC /
        COUNT(*) FILTER (WHERE p.sync_status != 'not_required')::NUMERIC * 100,
        2
      )
      ELSE 100
    END as sync_success_rate,
    COALESCE(AVG(p.sync_retry_count) FILTER (WHERE p.sync_status = 'sync_error'), 0) as avg_retry_count,
    (SELECT pe.sync_error_message FROM projects pe WHERE pe.sync_status = 'sync_error' ORDER BY pe.last_sync_attempt DESC LIMIT 1) as last_sync_error,
    (SELECT pe.name FROM projects pe WHERE pe.sync_status = 'sync_error' ORDER BY pe.last_sync_attempt DESC LIMIT 1) as last_error_project_name
  FROM projects p
  WHERE p.sync_status != 'not_required';
END;
$$;

-- Create function to get projects needing sync retry
CREATE OR REPLACE FUNCTION get_projects_needing_sync(max_retries INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sync_status miro_sync_status,
  sync_retry_count INTEGER,
  sync_error_message TEXT,
  last_sync_attempt TIMESTAMPTZ,
  miro_board_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.sync_status,
    p.sync_retry_count,
    p.sync_error_message,
    p.last_sync_attempt,
    p.miro_board_id
  FROM projects p
  WHERE p.sync_status IN ('pending', 'sync_error')
    AND p.sync_retry_count < max_retries
    AND p.miro_board_id IS NOT NULL
  ORDER BY
    CASE p.sync_status
      WHEN 'pending' THEN 0
      WHEN 'sync_error' THEN 1
    END,
    p.sync_retry_count ASC,
    p.created_at ASC;
END;
$$;

-- Create function to increment sync retry count
CREATE OR REPLACE FUNCTION increment_sync_retry(project_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE projects
  SET sync_retry_count = COALESCE(sync_retry_count, 0) + 1,
      last_sync_attempt = NOW()
  WHERE id = project_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_sync_health_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_projects_needing_sync(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_sync_retry(UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON COLUMN projects.sync_status IS 'Miro synchronization status: pending, syncing, synced, sync_error, not_required';
COMMENT ON COLUMN projects.sync_error_message IS 'Last error message if sync_status is sync_error';
COMMENT ON COLUMN projects.sync_retry_count IS 'Number of sync retry attempts';
COMMENT ON COLUMN projects.last_sync_attempt IS 'Timestamp of last sync attempt';
COMMENT ON COLUMN projects.last_synced_at IS 'Timestamp of last successful sync';
COMMENT ON COLUMN projects.miro_card_id IS 'ID of the project card in Miro timeline';
COMMENT ON COLUMN projects.miro_frame_id IS 'ID of the project frame in Miro board';
