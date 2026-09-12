create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id),
  guest_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

comment on table public.reviews is
  'One review per booking (enforced by the unique constraint), always '
  'starting unapproved. Only submit_review() ever inserts here — '
  'direct inserts bypass its eligibility checks entirely.';

alter table public.reviews enable row level security;

create policy "Anyone can read approved reviews"
  on public.reviews for select
  to authenticated, anon
  using (is_approved = true);

create policy "Owner can read all reviews, approved or not"
  on public.reviews for select
  to authenticated
  using (public.current_user_role() = 'owner');

create policy "Only owner can moderate reviews"
  on public.reviews for update
  to authenticated
  using (public.current_user_role() = 'owner')
  with check (public.current_user_role() = 'owner');

create function public.submit_review(
  p_booking_reference text,
  p_rating integer,
  p_comment text
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_checkout_date date;
  v_review public.reviews;
begin
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5.';
  end if;

  if trim(coalesce(p_comment, '')) = '' then
    raise exception 'A review needs some comment text.';
  end if;
  select * into v_booking
  from public.bookings
  where upper(left(id::text, 8)) = upper(p_booking_reference)
  limit 1;

  if v_booking.id is null then
    raise exception 'No booking found for that reference.';
  end if;

  if v_booking.status <> 'confirmed' then
    raise exception 'Only confirmed bookings can be reviewed.';
  end if;

  select max(end_date) into v_checkout_date
  from public.resource_bookings
  where booking_id = v_booking.id;

  if v_checkout_date is null or v_checkout_date >= current_date then
    raise exception 'This stay hasn''t finished yet — reviews open up after checkout.';
  end if;

  if exists (select 1 from public.reviews where booking_id = v_booking.id) then
    raise exception 'This booking has already been reviewed.';
  end if;

  insert into public.reviews (booking_id, guest_name, rating, comment)
  values (v_booking.id, v_booking.guest_name, p_rating, trim(p_comment))
  returning * into v_review;

  return v_review;
end;
$$;

comment on function public.submit_review is
  'The only path that ever inserts into reviews. Re-derives eligibility '
  'from the real booking record every time — confirmed status, checkout '
  'date actually in the past, and no existing review for that booking '
  '— rather than trusting anything the caller claims.';

create function public.approve_review(p_review_id uuid)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review public.reviews;
begin
  if public.current_user_role() <> 'owner' then
    raise exception 'Only the Owner can approve reviews.';
  end if;

  update public.reviews
  set is_approved = true
  where id = p_review_id
  returning * into v_review;

  if v_review.id is null then
    raise exception 'Review not found.';
  end if;

  return v_review;
end;
$$;

grant execute on function public.submit_review(text, integer, text) to anon, authenticated;
grant execute on function public.approve_review(uuid) to authenticated;
