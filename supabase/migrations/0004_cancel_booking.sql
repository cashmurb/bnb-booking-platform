create function public.cancel_booking(p_booking_id uuid)
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

  select * into v_booking
  from public.bookings
  where id = p_booking_id;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  if v_booking.status not in ('held', 'confirmed') then
    raise exception
      'Only held or confirmed bookings can be cancelled (this one is already %).',
      v_booking.status;
  end if;

  delete from public.resource_bookings
  where booking_id = p_booking_id;

  delete from public.driver_slot_bookings
  where booking_id = p_booking_id;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id
  returning * into v_booking;

  return v_booking;
end;
$$;

drop policy if exists "Owners can update bookings" on public.bookings;

revoke execute on function public.cancel_booking(uuid) from public;
grant execute on function public.cancel_booking(uuid) to authenticated;
