create extension if not exists btree_gist;

create type public.booking_status as enum (
  'held',
  'confirmed',
  'expired',
  'cancelled'
);

create type public.booking_source as enum (
  'manual',
  'website'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  status public.booking_status not null,
  source public.booking_source not null default 'manual',
  guest_name text not null,
  guest_contact text not null,
  notes text,
  hold_expires_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.bookings enable row level security;

create policy "Owners can read all bookings"
  on public.bookings for select
  to authenticated
  using (public.current_user_role() = 'owner');

create policy "Owners can create bookings"
  on public.bookings for insert
  to authenticated
  with check (public.current_user_role() = 'owner');

create policy "Owners can update bookings"
  on public.bookings for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create table public.resource_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  resource_id uuid not null references public.resources (id),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now(),
  constraint resource_bookings_valid_range check (start_date < end_date)
);

alter table public.resource_bookings
  add constraint resource_bookings_no_overlap
  exclude using gist (
    resource_id with =,
    daterange(start_date, end_date) with &&
  );

create index resource_bookings_booking_id_idx
  on public.resource_bookings (booking_id);

alter table public.resource_bookings enable row level security;

create policy "Owners can read resource bookings"
  on public.resource_bookings for select
  to authenticated
  using (public.current_user_role() = 'owner');

create table public.driver_slot_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  window_id smallint not null references public.driver_windows (id),
  slot_date date not null,
  created_at timestamptz not null default now(),
  unique (window_id, slot_date)
);

create index driver_slot_bookings_booking_id_idx
  on public.driver_slot_bookings (booking_id);

alter table public.driver_slot_bookings enable row level security;

create policy "Owners can read driver slot bookings"
  on public.driver_slot_bookings for select
  to authenticated
  using (public.current_user_role() = 'owner');

create function public.create_booking(
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

  if jsonb_array_length(p_resource_claims) = 0
     and jsonb_array_length(p_driver_claims) = 0 then
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

create function public.expire_stale_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expired_count integer;
begin
  delete from public.resource_bookings
  where booking_id in (
    select id from public.bookings
    where status = 'held' and hold_expires_at < now()
  );

  delete from public.driver_slot_bookings
  where booking_id in (
    select id from public.bookings
    where status = 'held' and hold_expires_at < now()
  );

  update public.bookings
  set status = 'expired'
  where status = 'held' and hold_expires_at < now();

  get diagnostics v_expired_count = row_count;
  return v_expired_count;
end;
$$;

