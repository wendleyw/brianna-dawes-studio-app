-- Fix notification "self-notify" by ensuring we exclude the ACTOR's public.users.id
-- (not auth.uid()) when calling notify_project_members(..., p_exclude_user_id).
--
-- Root cause:
-- - auth.uid() is auth.users.id
-- - notify_project_members expects public.users.id
-- - When passing auth.uid(), exclusion never matches and the actor receives their own notifications.

create or replace function public.create_project_with_designers(
  p_name text,
  p_client_id uuid,
  p_description text default null,
  p_status text default 'in_progress',
  p_priority text default 'medium',
  p_start_date timestamptz default null,
  p_due_date timestamptz default null,
  p_miro_board_id text default null,
  p_miro_board_url text default null,
  p_briefing jsonb default '{}',
  p_google_drive_url text default null,
  p_due_date_approved boolean default true,
  p_sync_status text default null,
  p_designer_ids uuid[] default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_id uuid;
  v_designer_id uuid;
  v_actor_user_id uuid;
begin
  -- Set flag to skip individual designer notifications (we'll notify all at once)
  perform set_config('app.skip_designer_notifications', '1', true);

  -- Actor is the current authenticated user mapped to public.users.id (if available)
  v_actor_user_id := public.get_user_id_from_auth();

  insert into public.projects (
    name, client_id, description, status, priority,
    start_date, due_date, miro_board_id, miro_board_url,
    briefing, google_drive_url, due_date_approved, sync_status
  ) values (
    p_name, p_client_id, p_description, p_status::public.project_status, p_priority::public.project_priority,
    p_start_date, p_due_date, p_miro_board_id, p_miro_board_url,
    p_briefing, p_google_drive_url, p_due_date_approved, p_sync_status::public.miro_sync_status
  )
  returning id into v_project_id;

  if p_designer_ids is not null and array_length(p_designer_ids, 1) > 0 then
    foreach v_designer_id in array p_designer_ids loop
      insert into public.project_designers (project_id, user_id)
      values (v_project_id, v_designer_id)
      on conflict do nothing;
    end loop;
  end if;

  -- Notify all project members about the new project, excluding the actor if known.
  perform public.notify_project_members(
    v_project_id,
    'project_assigned',
    'New project created',
    format('You have been added to the project \"%s\"', p_name),
    jsonb_build_object('projectId', v_project_id, 'projectName', p_name),
    v_actor_user_id
  );

  -- Reset flag
  perform set_config('app.skip_designer_notifications', '', true);

  return v_project_id;
end;
$$;

create or replace function public.notify_project_members_on_project_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_user_id uuid;
begin
  -- Skip when RPC already handled notifications in this transaction
  if current_setting('app.skip_project_notifications', true) = '1' then
    return new;
  end if;

  v_actor_user_id := public.get_user_id_from_auth();

  begin
    if new.was_reviewed is distinct from old.was_reviewed
      and new.was_reviewed = true
      and new.status = 'in_progress' then
      perform public.notify_project_members(
        new.id,
        'status_changed',
        'Changes requested',
        format('Changes requested for \"%s\".', new.name),
        jsonb_build_object('projectId', new.id, 'projectName', new.name, 'action', 'changes_requested'),
        v_actor_user_id
      );
    end if;

    if new.status is distinct from old.status then
      if new.status = 'review' then
        perform public.notify_project_members(
          new.id,
          'status_changed',
          'Review ready',
          format('\"%s\" is ready for your review.', new.name),
          jsonb_build_object('projectId', new.id, 'projectName', new.name, 'status', 'review'),
          v_actor_user_id
        );
      elsif new.status = 'done' then
        perform public.notify_project_members(
          new.id,
          'status_changed',
          'Project completed',
          format('\"%s\" was marked as completed.', new.name),
          jsonb_build_object('projectId', new.id, 'projectName', new.name, 'status', 'done'),
          v_actor_user_id
        );
      elsif new.status = 'urgent' or new.status = 'overdue' then
        perform public.notify_project_members(
          new.id,
          'status_changed',
          'Status updated',
          format('\"%s\" moved to %s.', new.name, replace(new.status::text, '_', ' ')),
          jsonb_build_object('projectId', new.id, 'projectName', new.name, 'status', new.status::text),
          v_actor_user_id
        );
      end if;
    end if;

    if new.was_approved is distinct from old.was_approved and new.was_approved = true then
      perform public.notify_project_members(
        new.id,
        'status_changed',
        'Client approved',
        format('Client approved \"%s\".', new.name),
        jsonb_build_object('projectId', new.id, 'projectName', new.name, 'action', 'client_approved'),
        v_actor_user_id
      );
    end if;
  exception
    when others then
      null;
  end;

  return new;
end;
$$;

create or replace function public.update_project_with_designers(
  p_project_id uuid,
  p_update_designers boolean default false,
  p_name text default null,
  p_description text default null,
  p_status text default null,
  p_priority text default null,
  p_start_date timestamptz default null,
  p_due_date timestamptz default null,
  p_client_id uuid default null,
  p_miro_board_id text default null,
  p_miro_board_url text default null,
  p_briefing jsonb default null,
  p_google_drive_url text default null,
  p_was_reviewed boolean default null,
  p_was_approved boolean default null,
  p_requested_due_date timestamptz default null,
  p_due_date_requested_at timestamptz default null,
  p_due_date_requested_by uuid default null,
  p_due_date_approved boolean default null,
  p_thumbnail_url text default null,
  p_designer_ids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_designer_id uuid;

  v_old_status project_status;
  v_old_was_reviewed boolean;
  v_old_was_approved boolean;
  v_old_name text;

  v_new_status project_status;
  v_new_was_reviewed boolean;
  v_new_was_approved boolean;
  v_new_name text;

  v_actor_user_id uuid;
begin
  perform set_config('app.skip_project_notifications', '1', true);

  v_actor_user_id := public.get_user_id_from_auth();

  select status, was_reviewed, was_approved, name
  into v_old_status, v_old_was_reviewed, v_old_was_approved, v_old_name
  from projects
  where id = p_project_id;

  if not found then
    raise exception 'Project not found: %', p_project_id;
  end if;

  update projects set
    name = coalesce(p_name, name),
    description = coalesce(p_description, description),
    status = coalesce(p_status::project_status, status),
    priority = coalesce(p_priority::project_priority, priority),
    start_date = coalesce(p_start_date, start_date),
    due_date = coalesce(p_due_date, due_date),
    client_id = coalesce(p_client_id, client_id),
    miro_board_id = coalesce(p_miro_board_id, miro_board_id),
    miro_board_url = coalesce(p_miro_board_url, miro_board_url),
    briefing = coalesce(p_briefing, briefing),
    google_drive_url = coalesce(p_google_drive_url, google_drive_url),
    was_reviewed = coalesce(p_was_reviewed, was_reviewed),
    was_approved = coalesce(p_was_approved, was_approved),
    requested_due_date = coalesce(p_requested_due_date, requested_due_date),
    due_date_requested_at = coalesce(p_due_date_requested_at, due_date_requested_at),
    due_date_requested_by = coalesce(p_due_date_requested_by, due_date_requested_by),
    due_date_approved = coalesce(p_due_date_approved, due_date_approved),
    thumbnail_url = coalesce(p_thumbnail_url, thumbnail_url),
    updated_at = now()
  where id = p_project_id;

  if p_update_designers = true then
    delete from project_designers where project_id = p_project_id;

    if p_designer_ids is not null and array_length(p_designer_ids, 1) > 0 then
      foreach v_designer_id in array p_designer_ids loop
        insert into project_designers (project_id, user_id)
        values (p_project_id, v_designer_id);
      end loop;
    end if;
  end if;

  select status, was_reviewed, was_approved, name
  into v_new_status, v_new_was_reviewed, v_new_was_approved, v_new_name
  from projects
  where id = p_project_id;

  begin
    if v_new_was_reviewed is distinct from v_old_was_reviewed
      and v_new_was_reviewed = true
      and v_new_status = 'in_progress' then
      perform public.notify_project_members(
        p_project_id,
        'status_changed',
        'Changes requested',
        format('Changes requested for \"%s\".', v_new_name),
        jsonb_build_object('projectId', p_project_id, 'projectName', v_new_name, 'action', 'changes_requested'),
        v_actor_user_id
      );
    end if;

    if v_new_status is distinct from v_old_status then
      if v_new_status = 'review' then
        perform public.notify_project_members(
          p_project_id,
          'status_changed',
          'Review ready',
          format('\"%s\" is ready for your review.', v_new_name),
          jsonb_build_object('projectId', p_project_id, 'projectName', v_new_name, 'status', 'review'),
          v_actor_user_id
        );
      elsif v_new_status = 'done' then
        perform public.notify_project_members(
          p_project_id,
          'status_changed',
          'Project completed',
          format('\"%s\" was marked as completed.', v_new_name),
          jsonb_build_object('projectId', p_project_id, 'projectName', v_new_name, 'status', 'done'),
          v_actor_user_id
        );
      elsif v_new_status = 'urgent' or v_new_status = 'overdue' then
        perform public.notify_project_members(
          p_project_id,
          'status_changed',
          'Status updated',
          format('\"%s\" moved to %s.', v_new_name, replace(v_new_status::text, '_', ' ')),
          jsonb_build_object('projectId', p_project_id, 'projectName', v_new_name, 'status', v_new_status::text),
          v_actor_user_id
        );
      end if;
    end if;

    if v_new_was_approved is distinct from v_old_was_approved and v_new_was_approved = true then
      perform public.notify_project_members(
        p_project_id,
        'status_changed',
        'Client approved',
        format('Client approved \"%s\".', v_new_name),
        jsonb_build_object('projectId', p_project_id, 'projectName', v_new_name, 'action', 'client_approved'),
        v_actor_user_id
      );
    end if;
  exception
    when others then
      null;
  end;

  return p_project_id;
end;
$$;

