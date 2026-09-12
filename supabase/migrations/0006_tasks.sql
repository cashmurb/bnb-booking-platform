create type public.task_type as enum ('cleaning', 'driver');
create type public.task_status as enum ('pending', 'done');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  type public.task_type not null,
  status public.task_status not null default 'pending',
  resource_booking_id uuid references public.resource_bookings (id) on delete cascade,
  driver_slot_booking_id uuid references public.driver_slot_bookings (id) on delete cascade,
  guest_name text not null,
  task_date date not null,
  resource_label text,
  driver_window_label text,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint tasks_exactly_one_source check (
    (type = 'cleaning' and resource_booking_id is not null and driver_slot_booking_id is null)
    or
    (type = 'driver' and driver_slot_booking_id is not null and resource_booking_id is null)
  )
);

create index tasks_status_date_idx on public.tasks (status, task_date);

alter table public.tasks enable row level security;

create policy "Owner and staff can read tasks"
  on public.tasks for select
  to authenticated
  using (public.current_user_role() in ('owner', 'staff'));

create function public.complete_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if public.current_user_role() not in ('owner', 'staff') then
    raise exception 'Only Owner or Staff can update tasks.';
  end if;

  update public.tasks
  set status = 'done', completed_at = now(), completed_by = auth.uid()
  where id = p_task_id and status = 'pending'
  returning * into v_task;

  if v_task.id is null then
    if not exists (select 1 from public.tasks where id = p_task_id) then
      raise exception 'Task not found.';
    end if;
    raise exception 'This task is already marked done.';
  end if;

  return v_task;
end;
$$;

create function public.reopen_task(p_task_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
begin
  if public.current_user_role() not in ('owner', 'staff') then
    raise exception 'Only Owner or Staff can update tasks.';
  end if;

  update public.tasks
  set status = 'pending', completed_at = null, completed_by = null
  where id = p_task_id and status = 'done'
  returning * into v_task;

  if v_task.id is null then
    if not exists (select 1 from public.tasks where id = p_task_id) then
      raise exception 'Task not found.';
    end if;
    raise exception 'This task is not marked done.';
  end if;

  return v_task;
end;
$$;

revoke execute on function public.complete_task(uuid) from public;
revoke execute on function public.reopen_task(uuid) from public;
grant execute on function public.complete_task(uuid) to authenticated;
grant execute on function public.reopen_task(uuid) to authenticated;

create or replace function public.create_booking(
  p_guest_name text,
  p_guest_contact text,
  p_status public.booking_status,
  p_notes text default null,
  p_hold_minutes integer default null,
  p_resource_claims jsonb default '[]'::jsonb,
  p_driver_claims jsonb default '[]'::jsonb
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_claim jsonb;
  v_resource_booking_id uuid;
  v_driver_slot_booking_id uuid;
  v_resource_type public.resource_type;
  v_resource_label text;
  v_window_label text;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can create bookings.';
  end if;

  if p_status not in ('held', 'confirmed') then
    raise exception 'New bookings must start as held or confirmed, not %.', p_status;
  end if;

  if p_status = 'held' and p_hold_minutes is null then
    raise exception 'A held booking needs p_hold_minutes.';
  end if;

  if coalesce(jsonb_typeof(p_resource_claims), 'null') <> 'array'
     or coalesce(jsonb_typeof(p_driver_claims), 'null') <> 'array' then
    raise exception 'Booking claims must be JSON arrays.';
  end if;

  if coalesce(jsonb_array_length(p_resource_claims), 0) = 0
     and coalesce(jsonb_array_length(p_driver_claims), 0) = 0 then
    raise exception 'A booking needs at least one resource or driver claim.';
  end if;

  insert into public.bookings (
    status, source, guest_name, guest_contact, notes,
    hold_expires_at, created_by
  ) values (
    p_status, 'manual', p_guest_name, p_guest_contact, p_notes,
    case when p_status = 'held'
      then now() + make_interval(mins => p_hold_minutes)
      else null
    end,
    auth.uid()
  )
  returning * into v_booking;

  for v_claim in select * from jsonb_array_elements(p_resource_claims)
  loop
    insert into public.resource_bookings (booking_id, resource_id, start_date, end_date)
    values (
      v_booking.id,
      (v_claim ->> 'resource_id')::uuid,
      (v_claim ->> 'start_date')::date,
      (v_claim ->> 'end_date')::date
    )
    returning id into v_resource_booking_id;

    if p_status = 'confirmed' then
      select type, label into v_resource_type, v_resource_label
      from public.resources
      where id = (v_claim ->> 'resource_id')::uuid;

      if v_resource_type in ('room_2br', 'room_studio') then
        insert into public.tasks (
          booking_id, type, resource_booking_id,
          guest_name, task_date, resource_label
        ) values (
          v_booking.id, 'cleaning', v_resource_booking_id,
          v_booking.guest_name, (v_claim ->> 'end_date')::date, v_resource_label
        );
      end if;
    end if;
  end loop;

  for v_claim in select * from jsonb_array_elements(p_driver_claims)
  loop
    insert into public.driver_slot_bookings (booking_id, window_id, slot_date)
    values (
      v_booking.id,
      (v_claim ->> 'window_id')::smallint,
      (v_claim ->> 'slot_date')::date
    )
    returning id into v_driver_slot_booking_id;

    if p_status = 'confirmed' then
      select label into v_window_label
      from public.driver_windows
      where id = (v_claim ->> 'window_id')::smallint;

      insert into public.tasks (
        booking_id, type, driver_slot_booking_id,
        guest_name, task_date, driver_window_label
      ) values (
        v_booking.id, 'driver', v_driver_slot_booking_id,
        v_booking.guest_name, (v_claim ->> 'slot_date')::date, v_window_label
      );
    end if;
  end loop;

  return v_booking;
end;
$$;

revoke execute on function public.create_booking(text, text, public.booking_status, text, integer, jsonb, jsonb) from public;
grant execute on function public.create_booking(text, text, public.booking_status, text, integer, jsonb, jsonb) to authenticated;
