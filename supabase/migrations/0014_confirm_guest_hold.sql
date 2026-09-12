create function public.generate_tasks_for_booking(p_booking_id uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_resource_claim record;
  v_driver_claim record;
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  for v_resource_claim in
    select rb.id as resource_booking_id, rb.end_date, r.label
    from public.resource_bookings rb
    join public.resources r on r.id = rb.resource_id
    where rb.booking_id = p_booking_id
      and r.type in ('room_2br', 'room_studio')
  loop
    insert into public.tasks (
      booking_id, type, resource_booking_id,
      guest_name, task_date, resource_label
    ) values (
      p_booking_id, 'cleaning', v_resource_claim.resource_booking_id,
      v_booking.guest_name, v_resource_claim.end_date, v_resource_claim.label
    );
  end loop;

  for v_driver_claim in
    select dsb.id as driver_slot_booking_id, dsb.slot_date, dw.label
    from public.driver_slot_bookings dsb
    join public.driver_windows dw on dw.id = dsb.window_id
    where dsb.booking_id = p_booking_id
  loop
    insert into public.tasks (
      booking_id, type, driver_slot_booking_id,
      guest_name, task_date, driver_window_label
    ) values (
      p_booking_id, 'driver', v_driver_claim.driver_slot_booking_id,
      v_booking.guest_name, v_driver_claim.slot_date, v_driver_claim.label
    );
  end loop;
end;
$$;

comment on function public.generate_tasks_for_booking is
  'Shared by create_booking() (Owner, confirms directly) and '
  'confirm_guest_hold() (guest, held then confirmed later) so both paths '
  'generate tasks identically, from one place. Reads the booking''s '
  'already-inserted resource_bookings/driver_slot_bookings rows, not raw '
  'JSON claims — call this AFTER those rows exist.';

create or replace function public.create_booking(
  p_guest_name text,
  p_guest_contact text,
  p_status public.booking_status,
  p_notes text default null,
  p_hold_minutes integer default null,
  p_guest_count integer default null,
  p_final_total_php numeric(10, 2) default null,
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
  v_calculated_total numeric(10, 2);
begin
  if public.current_user_role() is null then
    raise exception 'Not authenticated.';
  end if;

  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can create bookings.';
  end if;

  if p_status not in ('held', 'confirmed') then
    raise exception 'New bookings must start as held or confirmed, not %.', p_status;
  end if;

  if p_status = 'held' and p_hold_minutes is null then
    raise exception 'A held booking needs p_hold_minutes.';
  end if;

  if jsonb_array_length(p_resource_claims) = 0
     and jsonb_array_length(p_driver_claims) = 0 then
    raise exception 'A booking needs at least one resource or driver claim.';
  end if;

  if p_final_total_php is not null and p_final_total_php < 0 then
    raise exception 'Final total cannot be negative.';
  end if;

  v_calculated_total := public.calculate_booking_total(
    p_guest_count, p_resource_claims, p_driver_claims
  );

  insert into public.bookings (
    status, source, guest_name, guest_contact, notes,
    hold_expires_at, created_by, guest_count,
    calculated_total_php, final_total_php
  ) values (
    p_status, 'manual', p_guest_name, p_guest_contact, p_notes,
    case when p_status = 'held'
      then now() + make_interval(mins => p_hold_minutes)
      else null
    end,
    auth.uid(),
    p_guest_count,
    v_calculated_total,
    coalesce(p_final_total_php, v_calculated_total)
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
    );
  end loop;

  for v_claim in select * from jsonb_array_elements(p_driver_claims)
  loop
    insert into public.driver_slot_bookings (booking_id, window_id, slot_date)
    values (
      v_booking.id,
      (v_claim ->> 'window_id')::smallint,
      (v_claim ->> 'slot_date')::date
    );
  end loop;

  if p_status = 'confirmed' then
    perform public.generate_tasks_for_booking(v_booking.id);
  end if;

  return v_booking;
end;
$$;

comment on function public.create_booking is
  'The Owner''s tool. Unchanged behavior — still owner-only, still the '
  'only path to a directly-confirmed manual booking — refactored to '
  'call generate_tasks_for_booking() instead of an inline copy of the '
  'same logic, so it matches confirm_guest_hold() exactly.';

-- ----------------------------------------------------------------------------
-- confirm_guest_hold() — the actual gap this migration closes.
-- ----------------------------------------------------------------------------

create function public.confirm_guest_hold(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  select * into v_booking from public.bookings
  where id = p_booking_id and status = 'held' and source = 'website';

  if v_booking.id is null then
    raise exception 'No active guest hold found for that id.';
  end if;

  if v_booking.hold_expires_at < now() then
    raise exception 'This hold has expired. Please start again.';
  end if;

  update public.bookings
  set status = 'confirmed', hold_expires_at = null
  where id = p_booking_id
  returning * into v_booking;

  perform public.generate_tasks_for_booking(p_booking_id);

  return v_booking;
end;
$$;

comment on function public.confirm_guest_hold is
  'Closes the held->confirmed gap for guest bookings — this phase''s '
  'stubbed "payment" step calls this, no real charge involved yet. Same '
  'safety design as cancel_guest_hold(): authorization is knowing the '
  'booking id, bounded to rows that are BOTH held AND source=website, so '
  'it structurally cannot touch a confirmed booking or an Owner-created '
  'one. Explicitly checks hold_expires_at rather than trusting the '
  'pg_cron sweep''s timing, since the sweep only runs once a minute.';

grant execute on function public.confirm_guest_hold(uuid) to anon;
