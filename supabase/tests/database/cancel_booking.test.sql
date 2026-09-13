begin;
select plan(6);

grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant select on public.bookings to authenticated;

insert into auth.users (id) values ('11111111-1111-1111-1111-111111111111');
update public.profiles set role = 'owner', full_name = 'Cashmere Alin'
  where id = '11111111-1111-1111-1111-111111111111';
insert into auth.users (id) values ('33333333-3333-3333-3333-333333333333');
update public.profiles set role = 'staff', full_name = 'William Alin'
  where id = '33333333-3333-3333-3333-333333333333';

insert into public.bookings (id, guest_name, guest_contact, guest_email, status, source)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Test Guest A', '09171234567', 'a@example.com', 'confirmed', 'website');
insert into public.bookings (id, guest_name, guest_contact, guest_email, status, source)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Test Guest B', '09171234568', 'b@example.com', 'confirmed', 'website');
insert into public.bookings (id, guest_name, guest_contact, status, source)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Guest C', '09171234569', 'confirmed', 'website');

set role authenticated;
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$ select public.cancel_booking('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'The old-style single-argument call still resolves unambiguously'
);
reset role;

select is(
  (select status from public.bookings where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'cancelled',
  'Cancelling without a reason still marks the booking cancelled'
);

set role authenticated;
select set_config('test.current_user_id', '11111111-1111-1111-1111-111111111111', true);
select lives_ok(
  $$ select public.cancel_booking('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
       'Property closed for emergency roof repairs after typhoon damage.') $$,
  'Cancelling with a reason succeeds'
);
reset role;

select is(
  (select cancellation_reason from public.bookings where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  'Property closed for emergency roof repairs after typhoon damage.',
  'The cancellation reason is actually stored on the booking'
);

set role authenticated;
select set_config('test.current_user_id', '33333333-3333-3333-3333-333333333333', true);
select throws_ok(
  $$ select public.cancel_booking('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Trying as staff') $$,
  'Only the Owner can cancel bookings.',
  'Staff cannot cancel bookings, with or without a reason'
);
reset role;

select is(
  (select status from public.bookings where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'confirmed',
  'The booking Staff tried to cancel is genuinely untouched'
);

select * from finish();
rollback;
