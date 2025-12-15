-- Robust actor exclusion for notifications.
--
-- Problem:
-- Some callsites historically passed `auth.uid()` (auth.users.id) to
-- `notify_project_members(..., p_exclude_user_id)`, but the function expects
-- `public.users.id`. When that happens, the actor is not excluded and receives
-- self-notifications.
--
-- Fix:
-- - Accept either `public.users.id` OR `public.users.auth_user_id` in
--   `p_exclude_user_id` and resolve to the correct `public.users.id`.
-- - Preserve the default behavior from 052: when exclusion is NULL, exclude
--   the current actor via `public.get_user_id_from_auth()` when available.

create or replace function public.notify_project_members(
  p_project_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_data jsonb default '{}',
  p_exclude_user_id uuid default null
)
returns setof public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_exclude_user_id uuid;
begin
  v_exclude_user_id := null;

  -- If a caller provides an explicit exclusion, support both:
  -- - public.users.id (preferred)
  -- - public.users.auth_user_id (legacy/broken callsites passing auth.uid()).
  if p_exclude_user_id is not null then
    if exists (select 1 from public.users u where u.id = p_exclude_user_id) then
      v_exclude_user_id := p_exclude_user_id;
    else
      select u.id
      into v_exclude_user_id
      from public.users u
      where u.auth_user_id = p_exclude_user_id
      limit 1;
    end if;
  end if;

  -- Default exclusion: the current actor performing the change.
  v_exclude_user_id :=
    coalesce(
      v_exclude_user_id,
      public.get_user_id_from_auth(),
      '00000000-0000-0000-0000-000000000000'::uuid
    );

  -- Notify client
  select client_id into v_user_id from public.projects where id = p_project_id;
  if v_user_id is not null and v_user_id != v_exclude_user_id then
    return next public.create_notification(v_user_id, p_type, p_title, p_message, p_data);
  end if;

  -- Notify designers
  for v_user_id in
    select user_id from public.project_designers where project_id = p_project_id
  loop
    if v_user_id != v_exclude_user_id then
      return next public.create_notification(v_user_id, p_type, p_title, p_message, p_data);
    end if;
  end loop;

  return;
end;
$$;

