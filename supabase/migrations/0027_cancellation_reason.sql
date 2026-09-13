alter table public.bookings add column cancellation_reason text;

comment on column public.bookings.cancellation_reason is
  'Set by cancel_booking() when the Owner cancels a booking — shown to '
  'the guest in the cancellation email (booking-emails.ts) and kept '
  'here as a permanent record. Null for any booking that was never '
  'cancelled, or was cancelled before this column existed.';

drop function if exists public.cancel_booking(uuid);

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can cancel bookings.';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status not in ('held', 'confirmed') then
    raise exception
      'Only held or confirmed bookings can be cancelled (this one is already %).',
      v_booking.status;
  end if;

  delete from public.resource_bookings where booking_id = p_booking_id;
  delete from public.driver_slot_bookings where booking_id = p_booking_id;

  update public.bookings
  set status = 'cancelled', cancellation_reason = p_reason
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

comment on function public.cancel_booking is
  'The only safe way to cancel a booking — releases its resource/driver '
  'claims in the same transaction as the status change, so a cancelled '
  'booking never leaves a room looking occupied. security definer for '
  'the same reason as create_booking(): the claim tables have no direct '
  'client write access, so this function is the sole path, gated by the '
  'explicit owner check at the top. p_reason is optional (default null) '
  'so existing callers that only ever pass p_booking_id keep working '
  'unchanged.

  IMPORTANT for callers: this function DELETES resource_bookings before '
  'returning — the room label and dates are gone from the database by '
  'the time this call returns. Fetch that data BEFORE calling this '
  'function if you need it afterward (e.g. for a cancellation email) — '
  'see dashboard/bookings/actions.ts.';
