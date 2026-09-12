create type public.user_role as enum ('owner', 'staff');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Unnamed'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'staff')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.current_user_role()
returns public.user_role
language sql
security definer set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Owners can read all profiles"
  on public.profiles for select
  using (public.current_user_role() = 'owner');

create type public.resource_type as enum (
  'room_2br',
  'room_studio',
  'vehicle_car',
  'vehicle_motorbike',
  'vehicle_bicycle'
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  type public.resource_type not null,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.resources enable row level security;

create policy "Any authenticated user can read resources"
  on public.resources for select
  to authenticated
  using (true);

create policy "Only owners can modify resources"
  on public.resources for all
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

insert into public.resources (type, label) values
  ('room_2br',       '2-Bedroom Unit'),
  ('room_studio',     'Studio Unit A'),
  ('room_studio',     'Studio Unit B'),
  ('vehicle_car',       'Car 1'),
  ('vehicle_car',       'Car 2'),
  ('vehicle_motorbike', 'Motorbike 1'),
  ('vehicle_motorbike', 'Motorbike 2'),
  ('vehicle_bicycle',   'Bicycle 1'),
  ('vehicle_bicycle',   'Bicycle 2');

create table public.driver_windows (
  id smallint primary key,
  label text not null,
  start_time time not null,
  end_time time not null,
  price_php numeric(10, 2) not null,
  sort_order smallint not null,
  spans_midnight boolean not null default false
);

alter table public.driver_windows enable row level security;

create policy "Any authenticated user can read driver windows"
  on public.driver_windows for select
  to authenticated
  using (true);

insert into public.driver_windows
  (id, label, start_time, end_time, price_php, sort_order, spans_midnight) values
  (1, '6:00 AM – 11:00 AM',  '06:00', '11:00', 500.00, 1, false),
  (2, '12:00 NN – 4:00 PM',  '12:00', '16:00', 300.00, 2, false),
  (3, '4:00 PM – 8:00 PM',   '16:00', '20:00', 500.00, 3, false),
  (4, '9:00 PM – 11:00 PM',  '21:00', '23:00', 300.00, 4, false),
  (5, '11:00 PM – 5:00 AM',  '23:00', '05:00', 650.00, 5, true);
