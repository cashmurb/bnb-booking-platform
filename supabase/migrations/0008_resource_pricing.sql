alter table public.resources
  add column nightly_rate_php numeric(10, 2),
  add column base_occupancy smallint,
  add column max_occupancy smallint,
  add column extra_guest_fee_php numeric(10, 2),
  add column cleaning_fee_php numeric(10, 2);

alter table public.resources
  add constraint resources_nightly_rate_positive
    check (nightly_rate_php is null or nightly_rate_php > 0),
  add constraint resources_extra_guest_fee_nonnegative
    check (extra_guest_fee_php is null or extra_guest_fee_php >= 0),
  add constraint resources_cleaning_fee_nonnegative
    check (cleaning_fee_php is null or cleaning_fee_php >= 0),
  add constraint resources_base_occupancy_positive
    check (base_occupancy is null or base_occupancy > 0),
  add constraint resources_max_occupancy_valid
    check (
      max_occupancy is null or base_occupancy is null
      or max_occupancy >= base_occupancy
    );

comment on column public.resources.nightly_rate_php is
  'Per-resource nightly rate. NULL for vehicles until that pricing exists.';
comment on column public.resources.base_occupancy is
  'Guests included in nightly_rate_php with no extra charge. Rooms only.';
comment on column public.resources.max_occupancy is
  'Hard cap enforced at booking time — never just priced, always blocked '
  'above this. Rooms only.';
comment on column public.resources.extra_guest_fee_php is
  'Charged per guest above base_occupancy, up to max_occupancy. Rooms only.';
comment on column public.resources.cleaning_fee_php is
  'Flat fee per stay (not per night). Rooms only.';

-- Real, confirmed figures — not placeholders.
update public.resources set
  nightly_rate_php = 2800,
  base_occupancy = 6,
  max_occupancy = 10,
  extra_guest_fee_php = 350,
  cleaning_fee_php = 700
where label = '2-Bedroom Unit';

update public.resources set
  nightly_rate_php = 1350,
  base_occupancy = 2,
  max_occupancy = 4,
  extra_guest_fee_php = 350,
  cleaning_fee_php = 500
where label in ('Studio Unit A', 'Studio Unit B');
