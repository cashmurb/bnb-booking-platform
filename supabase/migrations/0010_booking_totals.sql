alter table public.bookings
  add column guest_count smallint,
  add column calculated_total_php numeric(10, 2),
  add column final_total_php numeric(10, 2);

alter table public.bookings
  add constraint bookings_guest_count_positive
    check (guest_count is null or guest_count > 0),
  add constraint bookings_calculated_total_nonnegative
    check (calculated_total_php is null or calculated_total_php >= 0),
  add constraint bookings_final_total_nonnegative
    check (final_total_php is null or final_total_php >= 0);

comment on column public.bookings.guest_count is
  'Required whenever the booking includes a room claim; null for '
  'driver-only bookings, which have no occupancy concept.';
comment on column public.bookings.calculated_total_php is
  'The automatic figure — room rate x nights, plus extra-guest fee, plus '
  'cleaning fee, plus any driver window prices. Never overridden. Vehicle '
  'claims contribute nothing here until vehicle pricing exists.';
comment on column public.bookings.final_total_php is
  'What is actually charged. Equals calculated_total_php unless the '
  'Owner explicitly overrides it (discount, comp, special rate).';
