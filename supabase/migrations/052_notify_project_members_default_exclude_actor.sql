-- Make notify_project_members() exclude the current actor by default.
--
-- Why:
-- - Many triggers/functions call notify_project_members(..., p_exclude_user_id := NULL)
-- - When the actor is also a project member (ex: client creating their own project),
--   the actor receives "self-notifications", which is confusing.
--
-- Approach:
-- - If p_exclude_user_id is NULL, resolve actor via public.get_user_id_from_auth()
--   (maps auth.uid() → public.users.id) and exclude it.
-- - If mapping is unavailable, fall back to a zero UUID (no exclusion).

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
  -- Default exclusion: the actor performing the change (public.users.id), when available.
  v_exclude_user_id :=
    coalesce(
      p_exclude_user_id,
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

