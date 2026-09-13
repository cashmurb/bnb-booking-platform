begin;
select plan(5);

grant update (avatar_path) on public.profiles to authenticated;
grant select on public.profiles to authenticated, anon;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
update public.profiles set role = 'owner', full_name = 'Cashmere Alin'
  where id = '11111111-1111-1111-1111-111111111111';

insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333');
update public.profiles set role = 'staff', full_name = 'William Alin'
  where id = '33333333-3333-3333-3333-333333333333';

set role authenticated;
select set_config('test.current_user_id', '33333333-3333-3333-3333-333333333333', true);
select lives_ok(
  $$ update public.profiles set avatar_path = '33333333-3333-3333-3333-333333333333/photo.jpg'
     where id = '33333333-3333-3333-3333-333333333333' $$,
  'A user can update their own avatar_path'
);
reset role;

select is(
  (select avatar_path from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  '33333333-3333-3333-3333-333333333333/photo.jpg',
  'The avatar_path update actually took effect'
);

set role authenticated;
select set_config('test.current_user_id', '33333333-3333-3333-3333-333333333333', true);
select throws_like(
  $$ update public.profiles set role = 'owner' where id = '33333333-3333-3333-3333-333333333333' $$,
  '%permission denied%',
  'Staff cannot escalate their own role via the profile update path'
);
reset role;

select is(
  (select role from public.profiles where id = '33333333-3333-3333-3333-333333333333'),
  'staff',
  'Role genuinely remains staff after the blocked escalation attempt'
);

set role authenticated;
select set_config('test.current_user_id', '33333333-3333-3333-3333-333333333333', true);
update public.profiles set avatar_path = 'hijacked.jpg'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;

select isnt(
  (select avatar_path from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  'hijacked.jpg',
  'A user cannot overwrite another user''s avatar_path'
);

select * from finish();
rollback;
