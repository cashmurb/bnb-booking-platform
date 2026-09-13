alter table public.profiles add column avatar_path text;

comment on column public.profiles.avatar_path is
  'Storage path in the avatars bucket, e.g. "<user-id>/<uuid>.jpg". '
  'Null means no photo uploaded — show the default placeholder. '
  'Generate the actual displayable URL with getPublicUrl() at read '
  'time, never store the URL itself.';

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

grant update (avatar_path) on public.profiles to authenticated;

create policy "Users can update their own avatar_path"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Anyone can view avatars"
  on storage.objects for select
  to authenticated, anon
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
