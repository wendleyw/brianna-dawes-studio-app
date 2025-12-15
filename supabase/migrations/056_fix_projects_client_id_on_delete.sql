-- Fix invalid FK action: projects.client_id is NOT NULL but FK was ON DELETE SET NULL.
-- This caused client deletions to fail with 23502 (client_id null violates not-null).
--
-- We make the behavior explicit: deleting a client deletes their projects (and cascades
-- to deliverables, feedback, sync_jobs/logs, etc. via existing project cascades).

alter table public.projects
  drop constraint if exists projects_client_id_fkey;

alter table public.projects
  add constraint projects_client_id_fkey
  foreign key (client_id)
  references public.users(id)
  on delete cascade;

