-- Add versions JSONB column expected by the frontend and migration 039.
-- This is an additive, backward-compatible change.

begin;

ALTER TABLE public.deliverables
  ADD COLUMN IF NOT EXISTS versions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.deliverables.versions IS
  'Array of version objects (JSONB). Transitional: kept in sync with deliverable_versions when present.';

commit;

