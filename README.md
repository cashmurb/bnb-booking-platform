# WnJ Comfy Homes

A full booking website and management system for WnJ Comfy Homes & Tour Services. We are a small family-run B&B and tour business on Mactan Island, Lapu-Lapu City Philippines. 

In this system, guests can browse and book online, while the Owners and Staffs run the whole business (bookings, cleaning and driver tasks, pricing, reviews, and reports) from one private dashboard.

## Built with

- **Next.js 16** (App Router) — the whole site and dashboard
- **Supabase** — Postgres database, authentication, row-level security
- **Vercel** — hosting
- **Google Gemini** — powers both the guest FAQ chat widget and the
  Owner's "Ask Your Stats" assistant

## What guests can do

- Browse the three rooms and check real-time availability
- Book a room in three steps. Pick dates, enter details, confirm with the total calculated automatically (room rate, extra-guest fee, cleaning fee)
- Receive a booking confirmation email
- Download a PDF receipt right after booking
- Leave a review after their stay, using the reference number from their receipt
- Ask a chat widget quick questions (parking, cancellation, etc.), or message the Owner directly on Facebook if it can't answer
- See a real, calendar-based view of which dates are already taken

## What the Owner and Staff can do

Everything below lives behind sign-in at `/login`, completely separate from the guest site. The signed-in Owner or Staff account can never see the guest pages, and a guest can never reach the dashboard.

- **Dashboard** — a real-time overview: active bookings, upcoming check-ins, this month's occupancy, a mini calendar, upcoming tasks, and any guest reviews waiting for approval
- **Bookings** — see every booking, open one for full details, create a booking manually (for a phone or walk-in guest), and archive old ones to keep the main list clean without deleting anything
- **Tasks** — cleaning and driver-pickup tasks, generated automatically from real bookings, with a Start → Mark Done workflow both Owner and Staff can use
- **Listings** — edit each room's name, pricing, occupancy limits, and description
- **Calendar** — a full month view of every confirmed booking, color-coded by room
- **Records** — confirm which bookings have actually been paid
- **Reports** — real revenue and occupancy charts, plus "Ask Your Stats," a chat box that answers questions like "how did this month compare to last month" using your actual numbers, never guessed ones
- **Staff** — Owner-only: add new Staff accounts (each gets a temporary password to sign in with)

Owner and Staff see different things — Staff can reach Dashboard and Tasks; Bookings, Listings, Calendar, Records, Reports, and Staff management are Owner-only, enforced both in the app and in the database itself.

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
### 3. Set your environment variables

```bash
cp .env.example .env.local
```

Fill in four values:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY` 
- `GEMINI_API_KEY` 

### 4. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll see the real guest homepage. Go to `/login` for the management side. 

### 5. Create the Owner and Staff accounts

There's no public sign-up page anywhere in this app and that's deliberate. Every account is created directly, by you:

```bash
export $(grep -v '^#' .env.local | xargs)

npm run create-user -- owner@yourdomain.com "Owner Name" owner
npm run create-user -- staff@yourdomain.com "Staff Name" staff
```

Each command prints a temporary password. Share it with that person directly and have them sign in once.

## Deploying

1. Push this project to a GitHub repository.
2. In Vercel, choose **Import Git Repository** and select it.
3. Add all four environment variables from `.env.local` in Vercel's **Settings → Environment Variables**.
4. Deploy.

## Project structure

```
supabase/migrations/          23 migrations — see the setup section above
scripts/create-user.mjs       admin script for creating Owner/Staff accounts

src/proxy.ts                  route protection — keeps guests and the
                               management portal completely separate
src/lib/supabase/             client.ts, server.ts, middleware.ts —
                               Supabase connection helpers
src/lib/types.ts              shared types matching the database schema

src/app/                      guest-facing pages: Home, Rooms, Room
                               Detail (booking flow), About,
                               Cancellation Policy, Leave a Review
src/app/chat-widget.tsx       the guest FAQ chat widget
src/app/auth-background.tsx   shared visual background for the auth pages

src/app/login/                sign-in
src/app/forgot-password/      request a password reset
src/app/reset-password/       set a new password
src/app/auth/confirm/         handles the email link from a reset request

src/app/dashboard/            the whole management portal — Dashboard,
                               Bookings (+ Archive), Tasks, Listings,
                               Calendar, Records, Reports (+ the AI
                               stats assistant), Staff
```
