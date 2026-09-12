create function public.get_occupied_dates(
  p_resource_id uuid,
  p_range_start date,
  p_range_end date
)
returns setof date
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_range_end <= p_range_start then
    raise exception 'range_end must be after range_start.';
  end if;

  if p_range_end - p_range_start > 400 then
    raise exception 'Range too large — ask for at most about a year at a time.';
  end if;

  return query
  select distinct gs::date
  from public.resource_bookings rb
  cross join lateral generate_series(
    rb.start_date, rb.end_date - 1, '1 day'::interval
  ) as gs
  where rb.resource_id = p_resource_id
    and rb.start_date < p_range_end
    and rb.end_date > p_range_start
    and gs::date >= p_range_start
    and gs::date < p_range_end
  order by gs::date;
end;
$$;

comment on function public.get_occupied_dates is
  'Backs the guest-facing availability calendar. Returns which specific '
  'dates within the given range are occupied for a resource — expanded '
  'from the same resource_bookings rows the exclusion constraint '
  'enforces against, so it cannot disagree with the real rule. Even if '
  'a client-side bug let a guest select an occupied date anyway, '
  'create_guest_hold() still rejects it — this function is a UX layer '
  'on top of an existing guarantee, not a second one.';

grant execute on function public.get_occupied_dates(uuid, date, date) to anon;
