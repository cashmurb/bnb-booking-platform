# WnJ Comfy Homes

Owner and Staff dashboard for WnJ Comfy Homes.

## Features

- Owner and Staff login
- Room and vehicle inventory
- Driver time windows
- Manual bookings
- Protection against overlapping bookings
- Automatic expiration of old holds
- Booking cancellation that releases claims
- Staff tasks for cleaning and driver work

The guest website, payments, and Staff booking access are not included yet.

## Project location

```text
E:\wnj\wnj-comfy-homes
```

## Supabase setup

Create a Supabase project and copy the values from **Project Settings -> API**.

Run these files in **SQL Editor**, in order:

```text
supabase/migrations/0001_foundation.sql
supabase/migrations/0002_bookings.sql
supabase/migrations/0003_cron.sql
supabase/migrations/0004_cancel_booking.sql
supabase/migrations/0005_hardening.sql
supabase/migrations/0006_tasks.sql
supabase/migrations/0007_auth_hardening.sql
```

If `pg_cron` is unavailable, enable it under **Database -> Extensions**, then
run `0003_cron.sql` again.

The last migration creates tasks from confirmed bookings.

## Environment variables

Create `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Add these values:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Keep the service-role key private. It is used only when creating accounts.

## Install and run

```powershell
cd "E:\wnj\wnj-comfy-homes"
npm install
npm run dev
```

Open:

```text
http://localhost:3000/login
```

## Create accounts

Load the values needed by the account script:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = ((Get-Content .env.local | Select-String "^NEXT_PUBLIC_SUPABASE_URL=").Line -replace "^NEXT_PUBLIC_SUPABASE_URL=","").Trim()
$env:SUPABASE_SERVICE_ROLE_KEY = ((Get-Content .env.local | Select-String "^SUPABASE_SERVICE_ROLE_KEY=").Line -replace "^SUPABASE_SERVICE_ROLE_KEY=","").Trim()
```

Create accounts:

```powershell
npm run create-user -- owner@example.com "Owner Name" owner
npm run create-user -- staff@example.com "Staff Name" staff
```

Each command prints a temporary password.

## Use the dashboard

Owner:

- Create, view, and cancel bookings
- Open the task list

Staff:

- Open the task list
- Mark tasks done
- Reopen tasks when needed

Confirmed room bookings create cleaning tasks. Confirmed driver bookings
create driver tasks. Held bookings do not create tasks.

Vehicle bookings use the room booking's check-in and checkout dates, so the
dates are entered only once.

## Test

1. Sign in as Owner.
2. Create a booking.
3. Try booking the same resource for overlapping dates.
4. Confirm the second booking is rejected.
5. Cancel the first booking.
6. Book the same resource and dates again.
7. Sign in as Staff and open **Tasks**.
8. Mark a task done, then reopen it.

## Project files

```text
supabase/migrations/0001_foundation.sql  users, roles, inventory, driver windows
supabase/migrations/0002_bookings.sql    bookings and overlap protection
supabase/migrations/0003_cron.sql        hold expiration schedule
supabase/migrations/0004_cancel_booking.sql  cancellation and claim release
supabase/migrations/0005_hardening.sql  removes direct booking writes
supabase/migrations/0006_tasks.sql      Staff tasks and task functions
supabase/migrations/0007_auth_hardening.sql  limits hold expiration execution
scripts/create-user.mjs                  creates Owner and Staff accounts
src/lib/supabase/                         Supabase clients and sessions
src/app/login/                            login page and action
src/app/dashboard/                        dashboard, bookings, and tasks
src/proxy.ts                              route protection
```

## Checks

```powershell
npm run lint
npm run build
```
