create or replace function public.get_dashboard_metrics()
returns table (
  active_bookings integer,
  upcoming_checkins integer,
  pending_tasks integer,
  occupancy_rate_percent numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_bookings integer;
  v_upcoming_checkins integer;
  v_pending_tasks integer;
  v_booked_nights numeric;
  v_active_rooms integer;
  v_days_this_month integer;
begin
  if public.current_user_role() is null then
    raise exception 'Not authenticated.';
  end if;

  select count(distinct b.id) into v_active_bookings
  from public.bookings b
  join public.resource_bookings rb on rb.booking_id = b.id
  where b.status = 'confirmed' and rb.end_date >= current_date;

  select count(distinct b.id) into v_upcoming_checkins
  from public.bookings b
  join public.resource_bookings rb on rb.booking_id = b.id
  where b.status = 'confirmed'
    and rb.start_date >= current_date
    and rb.start_date <= current_date + 7;

  -- CHANGED: pending OR in_progress both count as outstanding work now.
  select count(*) into v_pending_tasks
  from public.tasks
  where status in ('pending', 'in_progress');

  select coalesce(sum(
    least(rb.end_date, (date_trunc('month', current_date) + interval '1 month')::date)
    - greatest(rb.start_date, date_trunc('month', current_date)::date)
  ), 0) into v_booked_nights
  from public.bookings b
  join public.resource_bookings rb on rb.booking_id = b.id
  join public.resources r on r.id = rb.resource_id
  where b.status = 'confirmed'
    and r.type in ('room_2br', 'room_studio')
    and rb.start_date < date_trunc('month', current_date) + interval '1 month'
    and rb.end_date > date_trunc('month', current_date);

  select count(*) into v_active_rooms
  from public.resources
  where is_active = true and type in ('room_2br', 'room_studio');

  v_days_this_month := extract(
    day from
    (date_trunc('month', current_date) + interval '1 month' - interval '1 day')
  );

  return query select
    v_active_bookings,
    v_upcoming_checkins,
    v_pending_tasks,
    case
      when v_active_rooms = 0 or v_days_this_month = 0 then 0
      else round(v_booked_nights / (v_active_rooms * v_days_this_month) * 100, 1)
    end;
end;
$$;
