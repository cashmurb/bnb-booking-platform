create policy "Anonymous visitors can read active resources"
  on public.resources for select
  to anon
  using (is_active = true);

create policy "Anonymous visitors can read driver windows"
  on public.driver_windows for select
  to anon
  using (true);
