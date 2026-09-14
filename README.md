# WnJ Comfy Homes

A full booking website and management system for a small family-run B&B and tour business on Mactan Island, Lapu-Lapu City Philippines. 

In this system, guests can browse and book online, while the Owners and Staffs manage bookings, cleaning and driver tasks, pricing, reviews, and reports from one private dashboard.

## Built with

- **Next.js 16** (App Router) - the whole site and dashboard
- **Supabase** - Postgres database, authentication, row-level security
- **Vercel** - hosting
- **Resend** - sends booking confirmation, cancellation, and password reset emails
- **Google Gemini** - powers both the guest FAQ chat widget and the Owner's "Ask Your Stats" assistant

## What guests can do

- Browse the rooms and check real-time availability
- Book a room in three steps. Pick dates, enter details, confirm with the total calculated automatically (room rate, extra-guest fee, cleaning fee)
- Leave a special request checkout (late check-in, extra pillow, etc.) which is visible to the Owner on that booking
- Get a booking confirmation email automatically 
- Download a PDF receipt right after booking
- Leave a review after their stay, using the reference number from their receipt or email 
- Ask the chat widget quick questions (parking, cancellation, etc.), or message the Owner directly on Facebook if it can't answer
- See a real, calendar-based view of which dates are already taken
- Get notified by email, with a reason, if the Owner ever has to cancel their booking
- Reset a forgotten password (only for Owner and Staff)

## What the Owner and Staff can do

Everything below lives behind sign-in at `/login`, completely separate from the guest site. A signed-in Owner or Staff account can never see this the way a guest does, and a guest can never reach the dashboard.

- **Dashboard** - a real-time overview of active bookings, upcoming check-ins, this month's occupancy, a mini calendar, upcoming tasks, and any guest reviews waiting for approval
- **Bookings** - see every booking with its current stay status (Upcoming/Currently Staying/Completed), computed automatically from the dates, open one for full details, create a booking manually for a phone or walk-in guest, cancel one with a reason (a guest gets emailed automatically), and archive old ones to keep the main list clean without deleting anything
- **Tasks** - cleaning and driver-pickup tasks, generated automatically from real bookings, with a Start → Mark Done workflow both Owner and Staff can use
- **Listings** - edit each room's name, pricing, occupancy limits, and description, and update photos shown on guest site 
- **Calendar** - a full month view of every confirmed booking, color-coded by room
- **Records** - confirm which bookings have actually been paid
- **Reports** - real revenue and occupancy charts, plus "Ask Your Stats," a chat box that answers questions like "how did this month compare to last month" using your actual numbers, never guessed ones
- **Staff** - Owner-only: add new Staff accounts (each gets a temporary password to sign in with), and deactivate one who's left which blocks them from signing in while keeping their history (which tasks they did, which bookings they made) intact
- **Reviews** - approve a guest's review before it shows up publicly
- **Profile photo** - anyone can upload their own, shown next to their name in the dashboard

Owner and Staff see different things. Staff can reach Dashboard and Tasks. Owners access everything from Bookings, Listings, Calendar, Records, Reports, and Staff management.

## Setup

### 1. Create your Supabase project

Go to [supabase.com](https://supabase.com), create a new project, and save the database password it gives you. In **Project Settings → API** you'll find the three values the next steps need: the **Project URL**, the **anon/public key**, and the **service_role key**.

### 2. Run the database migrations, in order

In the Supabase dashboard: **SQL Editor → New query**. Run each file in `supabase/migrations/` in order, as its own separate query:

```
0001_foundation.sql
0002_bookings.sql
0003_cron.sql
0004_cancel_booking.sql
0005_harden_bookings_write_path.sql
0006_tasks.sql
0007_fix_anonymous_auth_bypass.sql
0008_resource_pricing.sql
0009_anonymous_pricing_read.sql
0010_booking_totals.sql
0011_create_booking_pricing.sql
0012_guest_holds.sql
0013_availability_calendar.sql
0014_confirm_guest_hold.sql
0015_room_detail_content.sql
0016_tambuli_future_room.sql
0017_dashboard_metrics.sql
0018_task_in_progress.sql
0019_dashboard_progress_fix.sql
0020_guest_email.sql
0021_payment_verification.sql
0022_reviews.sql
0023_booking_archive.sql
0024_deactivate_staff.sql
0025_resource_photos.sql
0026_avatar_upload.sql
0027_cancellation_reason.sql
0028_confirm_returns_details.sql

```
### 3. Set up Resend (for booking, cancellation, and password reset emails)

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day).
2. Add and verify your real domain there.
3. In Supabase: **Authentication → Emails → SMTP Settings**, enable custom SMTP, and fill in Resend's values (host `smtp.resend.com`, port 465, username `resend`, password = your Resend API key). This is what makes password reset actually send.
4. Still in Supabase, edit the **Reset Password** email template (**Authentication → Emails**). Replace `{{ .ConfirmationURL }}` with:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password
   ```
5. In Resend, create an API key.

### 4. Set your environment variables

```bash
cp .env.example .env.local
```

Fill in six values:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` — e.g. `WnJ Comfy Homes <bookings@yourdomain.com>`, using your actual verified domain

### 5. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll see the real guest homepage. Go to `/login` for the management side.

### 6. Create the Owner and Staff accounts

There's no public sign-up page anywhere in this app, and that's deliberate. Every account is created directly, by you:

```bash
export $(grep -v '^#' .env.local | xargs)

npm run create-user -- owner@yourdomain.com "Owner Name" owner
npm run create-user -- staff@yourdomain.com "Staff Name" staff
```

Each command prints a temporary password. Share it with that person directly and have them sign in once.

**Two more account scripts, same setup as above:**

```bash
# Change someone's name, or move them between Owner and Staff
node scripts/update-user.mjs owner@yourdomain.com "New Name" owner

# Permanently remove an account
node scripts/delete-user.mjs mistaken@yourdomain.com
```

`delete-user.mjs` is for accounts created by mistake and never actually used. It checks first and refuses if the account has any real history (a booking they created, a task they completed or started), since deleting it would also erase who really did that work. For removing a Staff member who's actually been using the system, use **Deactivate Staff** in the dashboard instead (Staff page → Deactivate) which blocks them from signing in while keeping their history intact.

### 7. Move your original room photos into the real system (one-time)

Early on, room photos were static files bundled into the deployment. They've since moved to a real, editable system backed by Supabase Storage. However, if you're setting this project up fresh, there's nothing to migrate; new photos just get uploaded directly from the Listings page in the dashboard. `scripts/migrate-room-photos.mjs` only matters if you're inheriting a copy of this project that still has photos sitting in `public/images/rooms/` from before this system existed.

## Testing

Database-level tests (RLS policies, SQL functions — the layer where real bugs have actually shown up, again and again, during this project's own development) run automatically on every push via `.github/workflows/database-tests.yml`. To run them yourself locally, against a plain Postgres instance (no Docker, no full Supabase CLI stack needed):

```bash
# One-time: install pgTAP
sudo apt-get install postgresql-16 postgresql-16-pgtap   # macOS: brew install pgtap

# Set up a test database from the current migrations
PGDATABASE=wnj_test bash supabase/tests/setup.sh

# Run every test file
pg_prove -d wnj_test supabase/tests/database/*.test.sql
```

Each `.test.sql` file runs inside its own transaction that rolls back at the end — running the suite never leaves test data behind. Add a new test file for any new SQL function or RLS policy that has a real security boundary worth protecting.

## Deploying

1. Push this project to a GitHub repository.
2. In Vercel, choose **Import Git Repository** and select it.
3. Add all six environment variables from `.env.local` in Vercel's **Settings → Environment Variables** — `RESEND_API_KEY` should be Production-only (a preview build should never be able to email a real guest).
4. Deploy.
5. Point your real domain at the deployment (Vercel → your project → **Domains**), and update Supabase's **Site URL** (Authentication → URL Configuration) to match.

## What isn't built yet

**Payment processing and refunds.** Guests pick a payment *preference* at checkout, but no real charge happens. This needs a real PayMongo or Xendit merchant account, which only the business owner can set up. 

## Project structure

```
supabase/migrations/          28 migrations — see the setup section above
supabase/tests/                database test suite (pgTAP) — see Testing above
scripts/create-user.mjs        admin script for creating Owner/Staff accounts
scripts/update-user.mjs        admin script for editing an account's name/role
scripts/delete-user.mjs        admin script for removing a never-used account
scripts/migrate-room-photos.mjs one-time script, see setup step 7

src/proxy.ts                   route protection — keeps guests and the
                                management portal completely separate
src/lib/supabase/              client.ts, server.ts, middleware.ts, admin.ts —
                                Supabase connection helpers
src/lib/resend.ts               shared email-sending client
src/lib/booking-emails.ts       confirmation and cancellation email templates
src/lib/stay-phase.ts           derives Upcoming/Currently Staying/Completed
src/lib/types.ts                shared types matching the database schema

src/app/                       guest-facing pages: Home, Rooms, Room
                                Detail (booking flow), About,
                                Cancellation Policy, Leave a Review
src/app/chat-widget.tsx         the guest FAQ chat widget
src/app/auth-background.tsx     shared visual background for the auth pages

src/app/login/                  sign-in
src/app/forgot-password/        request a password reset
src/app/reset-password/         set a new password
src/app/auth/confirm/           handles the email link from a reset request

src/app/dashboard/              the whole management portal — Dashboard,
                                 Bookings (+ Archive), Listings (+ photos),
                                 Tasks, Calendar, Records, Reports (+ the
                                 AI stats assistant), Staff
```

