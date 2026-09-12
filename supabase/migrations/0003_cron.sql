create extension if not exists pg_cron;

select cron.schedule(
  'expire-stale-booking-holds',
  '* * * * *',
  $$ select public.expire_stale_holds(); $$
);

