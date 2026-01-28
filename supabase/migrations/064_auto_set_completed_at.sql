-- Migration: Auto-set completed_at when project status changes to/from 'done'
-- Created: 2026-01-28

-- Create trigger function to manage completed_at timestamp
CREATE OR REPLACE FUNCTION public.set_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- When status changes TO 'done' (and wasn't 'done' before)
  IF NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done' THEN
    -- Set completed_at to NOW() if it's currently NULL
    IF NEW.completed_at IS NULL THEN
      NEW.completed_at = NOW();
    END IF;
  
  -- When status changes AWAY FROM 'done' (was 'done' before, but not anymore)
  ELSIF OLD.status = 'done' AND NEW.status IS DISTINCT FROM 'done' THEN
    -- Clear completed_at
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

-- Create BEFORE UPDATE trigger on projects table
-- Only fires when status actually changes
CREATE TRIGGER trigger_set_completed_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_completed_at();

-- Backfill existing 'done' projects with completed_at = updated_at
-- Only updates projects where completed_at is currently NULL
UPDATE public.projects
SET completed_at = updated_at
WHERE status = 'done' AND completed_at IS NULL;

-- Rollback instructions (for documentation):
-- DROP TRIGGER IF EXISTS trigger_set_completed_at ON public.projects;
-- DROP FUNCTION IF EXISTS set_completed_at();
