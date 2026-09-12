alter table public.bookings
  add column payment_verified boolean not null default false;

comment on column public.bookings.payment_verified is
  'Set true only by mark_payment_verified() — the Owner confirming '
  'payment was actually received (checked their GCash/bank/card '
  'statement themselves), not something any automated process sets. '
  'Defaults false for every booking, including "Card" preference — '
  'there is no real payment gateway, so nothing auto-verifies.';

create function public.mark_payment_verified(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can verify payments.';
  end if;

  update public.bookings
  set payment_verified = true
  where id = p_booking_id and status = 'confirmed'
  returning * into v_booking;

  if v_booking.id is null then
    raise exception 'No confirmed booking found for that id.';
  end if;

  return v_booking;
end;
$$;

comment on function public.mark_payment_verified is
  'Owner-only. Bounded to confirmed bookings — a held or cancelled '
  'booking has nothing meaningful to verify payment for.';

grant execute on function public.mark_payment_verified(uuid) to authenticated;
