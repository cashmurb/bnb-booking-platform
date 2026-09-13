alter table public.profiles add column is_active boolean not null default true;

comment on column public.profiles.is_active is
  'Set to false when a Staff member leaves — checked on every request as '
  'a fast backstop alongside the real sign-in block (auth.users.'
  'banned_until, set via the Supabase admin API). Never set directly; '
  'only ever changed by deactivate_staff() below.';

create function public.deactivate_staff(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can deactivate a Staff account.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id;

  if v_profile.id is null then
    raise exception 'Account not found.';
  end if;

  if v_profile.role = 'owner' then
    raise exception 'Cannot deactivate an Owner account from here.';
  end if;

  update public.profiles
  set is_active = false
  where id = p_user_id
  returning * into v_profile;

  return v_profile;
end;
$$;

comment on function public.deactivate_staff is
  'Only ever sets is_active = false here — the real Supabase Auth ban '
  '(banned_until) and the immediate session revocation happen '
  'separately, in the calling Server Action, which has access to the '
  'service-role admin client this SQL function does not.';

create function public.reactivate_staff(p_user_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can reactivate a Staff account.';
  end if;

  update public.profiles
  set is_active = true
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Account not found.';
  end if;

  return v_profile;
end;
$$;

grant execute on function public.deactivate_staff(uuid) to authenticated;
grant execute on function public.reactivate_staff(uuid) to authenticated;
