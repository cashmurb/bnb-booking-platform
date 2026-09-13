begin;
select plan(7);

grant execute on function public.deactivate_staff(uuid) to authenticated;
grant execute on function public.reactivate_staff(uuid) to authenticated;
grant select on public.profiles to authenticated, anon;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
update public.profiles set role = 'owner', full_name = 'Cashmere Alin'
  where id = '11111111-1111-1111-1111-111111111111';

insert into auth.users (id) values ('22222222-2222-2222-2222-222222222222');
update public.profiles set role = 'owner', full_name = 'Anuraag'
  where id = '22222222-2222-2222-2222-222222222222';

insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333');
update public.profiles set role = 'staff', full_name = 'William Alin'
  where id = '33333333-3333-3333-3333-333333333333';

select ok(
  (select bool_and(is_active) from public.profiles
   where id in ('11111111-1111-1111-1111-111111111111',
                '22222222-2222-2222-2222-222222222222',
                '33333333-3333-3333-3333-333333333333')),
  'All accounts start active by default'
);

set role authenticated;
set local "request.jwt.claims" = '{}';
select set_config('test.current_user_id', '33333333-3333-3333-3333-333333333333', true);
select throws_ok(
  $$ select public.deactivate_staff('33333333-3333-3333-3333-333333333333') $$,
  'Only the Owner can deactivate a Staff account.',
  'Staff cannot deactivate any account, including their own'
);
reset role;

set role authenticated;
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', true);
select throws_ok(
  $$ select public.deactivate_staff('22222222-2222-2222-2222-222222222222') $$,
  'Cannot deactivate an Owner account from here.',
  'An Owner cannot deactivate another Owner account'
);
reset role;

set role authenticated;
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$ select public.deactivate_staff('33333333-3333-3333-3333-333333333333') $$,
  'Owner can deactivate a Staff account'
);
reset role;

select is(
  (select is_active from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  false,
  'Deactivated Staff account is_active is now false'
);

set role authenticated;
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', true);
select throws_ok(
  $$ select public.deactivate_staff('99999999-9999-9999-9999-999999999999') $$,
  'Account not found.',
  'Deactivating a nonexistent account id fails cleanly, not silently'
);
reset role;

set role authenticated;
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$ select public.reactivate_staff('33333333-3333-3333-3333-333333333333') $$,
  'Owner can reactivate a deactivated Staff account'
);
reset role;

select * from finish();
rollback;
