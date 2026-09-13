insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

create table public.resource_photos (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources (id) on delete cascade,
  storage_path text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.resource_photos is
  'Real, editable photo tracking for a room, replacing the old '
  'hardcoded ROOM_PHOTOS mapping. display_order''s lowest value per '
  'resource_id is that room''s cover photo everywhere a single '
  'representative image is needed (the guest browse grid, the '
  'Owner''s Listings grid).';

create index resource_photos_resource_id_idx
  on public.resource_photos (resource_id, display_order);

alter table public.resource_photos enable row level security;

create policy "Anyone can view resource photos"
  on public.resource_photos for select
  to authenticated, anon
  using (true);

create policy "Only Owner can add resource photos"
  on public.resource_photos for insert
  to authenticated
  with check (public.current_user_role() = 'owner');

create policy "Only Owner can reorder resource photos"
  on public.resource_photos for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create policy "Only Owner can remove resource photos"
  on public.resource_photos for delete
  to authenticated
  using (public.current_user_role() = 'owner');

create policy "Anyone can view room-photos files"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'room-photos');

create policy "Only Owner can upload room-photos files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'room-photos'
    and public.current_user_role() = 'owner'
  );

create policy "Only Owner can remove room-photos files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'room-photos'
    and public.current_user_role() = 'owner'
  );

grant select on public.resource_photos to anon, authenticated;
grant insert, update, delete on public.resource_photos to authenticated;
