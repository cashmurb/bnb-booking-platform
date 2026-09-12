alter table public.bookings add column guest_email text;
alter table public.bookings add column payment_method text;

comment on column public.bookings.guest_email is
  'Optional at hold creation (create_guest_hold), required before a '
  'guest hold can be confirmed (confirm_guest_hold) — collected on the '
  'checkout page via update_guest_hold_details(), not the initial '
  'Room Detail form. Optional on the Owner''s manual tool '
  '(create_booking) — a phoned or messaged-in booking may not come '
  'with one.';
comment on column public.bookings.payment_method is
  'A guest''s stated payment preference (card / gcash / bank_transfer) '
  '— intent only, never actually processed. No payment gateway exists '
  'in this system yet.';

drop function if exists public.create_booking(
  text, text, public.booking_status, text, integer, integer, numeric,
  jsonb, jsonb
);

create function public.create_booking(
  p_guest_name text,
  p_guest_contact text,
  p_status public.booking_status,
  p_notes text default null,
  p_hold_minutes integer default null,
  p_guest_count integer default null,
  p_final_total_php numeric(10, 2) default null,
  p_resource_claims jsonb default '[]'::jsonb,
  p_driver_claims jsonb default '[]'::jsonb,
  p_guest_email text default null
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
    status, source, guest_name, guest_contact, guest_email, notes,
    hold_expires_at, created_by, guest_count,
    calculated_total_php, final_total_php
  ) values (
    p_status, 'manual', p_guest_name, p_guest_contact, p_guest_email, p_notes,
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
  'The Owner''s tool. guest_email added (optional) — a phoned or '
  'messaged-in booking may not always come with an email on hand.';


drop function if exists public.create_guest_hold(
  text, text, integer, jsonb, jsonb
);

create function public.create_guest_hold(
  p_guest_name text,
  p_guest_contact text,
  p_guest_count integer default null,
  p_resource_claims jsonb default '[]'::jsonb,
  p_driver_claims jsonb default '[]'::jsonb,
  p_guest_email text default null
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
  v_hold_minutes constant integer := 10;
begin
  if trim(coalesce(p_guest_name, '')) = '' then
    raise exception 'Guest name is required.';
  end if;

  if trim(coalesce(p_guest_contact, '')) = '' then
    raise exception 'Guest contact is required.';
  end if;

  if jsonb_array_length(p_resource_claims) = 0
     and jsonb_array_length(p_driver_claims) = 0 then
    raise exception 'A booking needs at least one resource or driver claim.';
  end if;

  v_calculated_total := public.calculate_booking_total(
    p_guest_count, p_resource_claims, p_driver_claims
  );

  insert into public.bookings (
    status, source, guest_name, guest_contact, guest_email,
    hold_expires_at, created_by, guest_count,
    calculated_total_php, final_total_php
  ) values (
    'held', 'website', p_guest_name, p_guest_contact, p_guest_email,
    now() + make_interval(mins => v_hold_minutes),
    null,
    p_guest_count,
    v_calculated_total,
    v_calculated_total
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

  return v_booking;
end;
$$;

comment on function public.create_guest_hold is
  'The only anonymous-callable way to create a booking. Structurally '
  'restricted, not just permission-restricted: always status=held, '
  'always source=website, hold length hardcoded to 10 minutes, no price '
  'override possible. guest_email is optional here on purpose — it''s '
  'collected later, on the checkout page, via '
  'update_guest_hold_details(); confirm_guest_hold() is what actually '
  'requires it before letting the booking finalize.';

create function public.update_guest_hold_details(
  p_booking_id uuid,
  p_guest_email text,
  p_notes text default null,
  p_payment_method text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if trim(coalesce(p_guest_email, '')) = '' then
    raise exception 'Guest email is required.';
  end if;

  select * into v_booking from public.bookings
  where id = p_booking_id and status = 'held' and source = 'website';

  if v_booking.id is null then
    raise exception 'No active guest hold found for that id.';
  end if;

  if v_booking.hold_expires_at < now() then
    raise exception 'This hold has expired. Please start again.';
  end if;

  update public.bookings
  set guest_email = p_guest_email,
      notes = p_notes,
      payment_method = p_payment_method
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

comment on function public.update_guest_hold_details is
  'Attaches email/special-requests/payment-method to an existing guest '
  'hold, on the checkout page — after Room Detail''s initial '
  'name+phone+dates+guests step, before confirm_guest_hold(). Bounded '
  'to held+website rows only, same structural safety as '
  'cancel_guest_hold and confirm_guest_hold.';

create or replace function public.confirm_guest_hold(p_booking_id uuid)
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

  if trim(coalesce(v_booking.guest_email, '')) = '' then
    raise exception 'Guest email is required before confirming.';
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
  'stubbed "payment" step calls this, no real charge involved yet. Now '
  'also requires guest_email to be present (attached earlier via '
  'update_guest_hold_details) before it will confirm. Same safety '
  'design as cancel_guest_hold(): bounded to rows that are BOTH held '
  'AND source=website. Explicitly checks hold_expires_at rather than '
  'trusting the pg_cron sweep''s timing, since the sweep only runs '
  'once a minute.';

grant execute on function public.create_booking(
  text, text, public.booking_status, text, integer, integer, numeric,
  jsonb, jsonb, text
) to authenticated;

grant execute on function public.create_guest_hold(
  text, text, integer, jsonb, jsonb, text
) to authenticated, anon;

grant execute on function public.update_guest_hold_details(
  uuid, text, text, text
) to anon, authenticated;
