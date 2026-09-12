alter table public.bookings add column archived boolean not null default false;

comment on column public.bookings.archived is
  'Purely organizational — hides a booking from the main Bookings '
  'Management list. Unrelated to booking_status; any booking can be '
  'archived or restored regardless of its status, at the Owner''s own '
  'discretion. Never deletes anything.';

create function public.archive_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can archive bookings.';
  end if;

  update public.bookings
  set archived = true
  where id = p_booking_id
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  return v_booking;
end;
$$;

create function public.unarchive_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can restore archived bookings.';
  end if;

  update public.bookings
  set archived = false
  where id = p_booking_id
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  return v_booking;
end;
$$;

grant execute on function public.archive_booking(uuid) to authenticated;
grant execute on function public.unarchive_booking(uuid) to authenticated;
