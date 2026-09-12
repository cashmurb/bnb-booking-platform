drop function if exists public.create_booking(
  text, text, public.booking_status, text, integer, jsonb, jsonb
);

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
  v_resource_booking_id uuid;
  v_driver_slot_booking_id uuid;
  v_resource_type public.resource_type;
  v_resource_label text;
  v_window_label text;
  v_room_count integer;
  v_room record;
  v_nights integer;
  v_extra_guests integer;
  v_calculated_total numeric(10, 2) := 0;
  v_driver_price numeric(10, 2);
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

  select count(*) into v_room_count
  from jsonb_array_elements(p_resource_claims) as claim
  join public.resources r on r.id = (claim ->> 'resource_id')::uuid
  where r.type in ('room_2br', 'room_studio');

  if v_room_count > 1 then
    raise exception 'A booking can only include one room.';
  end if;

  if v_room_count = 1 then
    select
      r.nightly_rate_php, r.base_occupancy, r.max_occupancy,
      r.extra_guest_fee_php, r.cleaning_fee_php,
      (claim ->> 'start_date')::date as start_date,
      (claim ->> 'end_date')::date as end_date
    into v_room
    from jsonb_array_elements(p_resource_claims) as claim
    join public.resources r on r.id = (claim ->> 'resource_id')::uuid
    where r.type in ('room_2br', 'room_studio')
    limit 1;

    if v_room.nightly_rate_php is null then
      raise exception 'This room has no price configured yet.';
    end if;

    if p_guest_count is null then
      raise exception 'Guest count is required when booking a room.';
    end if;

    if p_guest_count < 1 then
      raise exception 'Guest count must be at least 1.';
    end if;

    if v_room.max_occupancy is not null and p_guest_count > v_room.max_occupancy then
      raise exception 'This room sleeps a maximum of % guests.', v_room.max_occupancy;
    end if;

    v_nights := v_room.end_date - v_room.start_date;
    v_extra_guests := greatest(0, p_guest_count - coalesce(v_room.base_occupancy, p_guest_count));

    v_calculated_total := v_calculated_total
      + (v_room.nightly_rate_php * v_nights)
      + (v_extra_guests * coalesce(v_room.extra_guest_fee_php, 0))
      + coalesce(v_room.cleaning_fee_php, 0);
  end if;

  for v_claim in select * from jsonb_array_elements(p_driver_claims)
  loop
    select price_php into v_driver_price
    from public.driver_windows where id = (v_claim ->> 'window_id')::smallint;

    v_calculated_total := v_calculated_total + coalesce(v_driver_price, 0);
  end loop;

  v_calculated_total := round(v_calculated_total, 2);

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
    )
    returning id into v_resource_booking_id;

    if p_status = 'confirmed' then
      select type, label into v_resource_type, v_resource_label
      from public.resources where id = (v_claim ->> 'resource_id')::uuid;

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
      from public.driver_windows where id = (v_claim ->> 'window_id')::smallint;

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

comment on function public.create_booking is
  'The only way to create a booking. security definer: resource_bookings, '
  'driver_slot_bookings, and tasks all have no INSERT policy of their '
  'own, so this function is the sole write path for all three, gated by '
  'the owner-only + authenticated checks at the top. Calculates the '
  'booking''s total (room + extra guests + cleaning + driver windows; '
  'vehicles contribute nothing yet), enforces max occupancy, enforces '
  'one room per booking, and generates the right tasks — all in one '
  'transaction, for both manual and future guest-checkout callers alike.';
