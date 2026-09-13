begin;
select plan(6);

grant execute on function public.confirm_guest_hold(uuid) to anon;
grant select on public.resources, public.resource_bookings, public.bookings to anon;

select id, label into temp room from public.resources where label = 'Studio Unit A';

insert into public.bookings (id, guest_name, guest_contact, guest_email, status, source, hold_expires_at, final_total_php)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Maria Santos', '09171234567', 'maria@example.com', 'held', 'website', now() + interval '10 minutes', 2700.00);

insert into public.resource_bookings (booking_id, resource_id, start_date, end_date)
select 'dddddddd-dddd-dddd-dddd-dddddddddddd', id, '2026-09-20', '2026-09-22' from room;

set role anon;
select set_config('test.current_user_id', '', true);
select is(
  (select public.confirm_guest_hold('dddddddd-dddd-dddd-dddd-dddddddddddd') ->> 'room_label'),
  'Studio Unit A',
  'confirm_guest_hold returns the room label directly, as an anonymous guest'
);
reset role;

select is(
  (select status from public.bookings where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'),
  'confirmed',
  'The booking status actually changed to confirmed'
);

set role anon;
select throws_ok(
  $$ select public.confirm_guest_hold('dddddddd-dddd-dddd-dddd-dddddddddddd') $$,
  'No active guest hold found for that id.',
  'An already-confirmed booking cannot be confirmed again'
);
reset role;

insert into public.bookings (id, guest_name, guest_contact, guest_email, status, source, hold_expires_at, final_total_php)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Jon Perez', '09171234568', 'jon@example.com', 'held', 'website', now() - interval '1 minute', 1350.00);

set role anon;
select throws_ok(
  $$ select public.confirm_guest_hold('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee') $$,
  'This hold has expired. Please start again.',
  'An expired hold cannot be confirmed'
);
reset role;

insert into public.bookings (id, guest_name, guest_contact, guest_email, status, source, hold_expires_at, final_total_php)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Ana Cruz', '09171234569', 'ana@example.com', 'held', 'website', now() + interval '10 minutes', 500.00);

set role anon;
create temp table driver_only_result as
  select public.confirm_guest_hold('ffffffff-ffff-ffff-ffff-ffffffffffff') as result;
reset role;

select ok(
  (select result from driver_only_result) is not null,
  'A driver-only booking (no room) confirms without crashing'
);

select is(
  (select result ->> 'room_label' from driver_only_result),
  null,
  'A driver-only booking correctly has a null room_label, not a crash'
);

select * from finish();
rollback;
