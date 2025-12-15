-- Ensure public.users.id has a default UUID generator so SECURITY DEFINER RPCs
-- (e.g. ensure_super_admin) can insert users without explicitly passing an id.

create extension if not exists pgcrypto;

alter table public.users
  alter column id set default gen_random_uuid();

