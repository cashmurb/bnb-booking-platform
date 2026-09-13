drop function if exists public.confirm_guest_hold(uuid);

create function public.confirm_guest_hold(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_result jsonb;
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

  select jsonb_build_object(
    'id', v_booking.id,
    'guest_name', v_booking.guest_name,
    'guest_email', v_booking.guest_email,
    'final_total_php', v_booking.final_total_php,
    'room_label', r.label,
    'start_date', rb.start_date,
    'end_date', rb.end_date
  )
  into v_result
  from public.resource_bookings rb
  join public.resources r on r.id = rb.resource_id
  where rb.booking_id = p_booking_id
  limit 1;

  if v_result is null then
    v_result := jsonb_build_object(
      'id', v_booking.id,
      'guest_name', v_booking.guest_name,
      'guest_email', v_booking.guest_email,
      'final_total_php', v_booking.final_total_php,
      'room_label', null,
      'start_date', null,
      'end_date', null
    );
  end if;

  return v_result;
end;
$$;

comment on function public.confirm_guest_hold is
  'Closes the held->confirmed gap for guest bookings — this phase''s '
  'stubbed "payment" step calls this, no real charge involved yet. Same '
  'safety design as cancel_guest_hold(): authorization is knowing the '
  'booking id, bounded to rows that are BOTH held AND source=website, so '
  'it structurally cannot touch a confirmed booking or an Owner-created '
  'one. Explicitly checks hold_expires_at rather than trusting the '
  'pg_cron sweep''s timing, since the sweep only runs once a minute. '
  'Returns jsonb (not public.bookings) including the room label and '
  'dates directly — see the header comment above for why this matters: '
  'a separate, guest-callable "fetch booking details" function would be '
  'a real privacy hole once a booking is no longer in its narrow '
  '"held" ownership window.';

grant execute on function public.confirm_guest_hold(uuid) to anon;
