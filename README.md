# WnJ Comfy Homes

A full booking website and management system for WnJ Comfy Homes & Tour Services. We are a small family-run B&B and tour business on Mactan Island, Lapu-Lapu City Philippines. One property, three rooms, built from the ground up: guests can browse and book online, and the Owner and Staff run the whole business — bookings, cleaning and driver tasks, pricing, reviews, and reports — from one private dashboard.

## Built with

- **Next.js 16** (App Router) — the whole site and dashboard
- **Supabase** — Postgres database, authentication, row-level security
- **Vercel** — hosting
- **Google Gemini** — powers both the guest FAQ chat widget and the
  Owner's "Ask Your Stats" assistant

## What guests can do

- Browse the three rooms and check real-time availability
- Book a room in three steps — pick dates, enter details, confirm — with the total calculated automatically (room rate, extra-guest fee, cleaning fee)
- Download a real PDF receipt right after booking
- Read the actual cancellation policy
- Leave a review after their stay, using the reference number from their receipt — no account needed
- Ask a chat widget quick questions (parking, cancellation, etc.), or message the Owner directly on Facebook if it can't answer
- See a real, calendar-based view of which dates are already taken

## What the Owner and Staff can do

Everything below lives behind sign-in at `/login`, completely separate from the guest site — a signed-in Owner or Staff account can never see the guest pages, and a guest can never reach the dashboard.

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
0019_dashboard_metrics_in_progress_fix.sql
0020_guest_email.sql
0021_payment_verification.sql
0022_reviews.sql
0023_booking_archive.sql
```

For `0003`: if `create extension if not exists pg_cron;` fails, go to **Database → Extensions**, enable `pg_cron` there, then re-run just the `select cron.schedule(...)` line from that file on its own.

Already run some of these before? Just run whatever's missing, in order — each one only depends on the ones before it.

### 3. Set your environment variables

```bash
cp .env.example .env.local
```

Fill in four values:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase, step 1
- `SUPABASE_SERVICE_ROLE_KEY` — also from Supabase, step 1. Used server-side only, by the Add Staff feature — never exposed to the browser
- `GEMINI_API_KEY` — a free key from
  [aistudio.google.com](https://aistudio.google.com/apikey), used by both the guest chat widget and the Owner's stats assistant

### 4. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll see the real guest homepage. Go to `/login` for the management side. You won't be able to sign in yet, since no accounts exist — that's next.

### 5. Create the Owner and Staff accounts

There's no public sign-up page anywhere in this app — that's deliberate. Every account is created directly, by you:

```bash
export $(grep -v '^#' .env.local | xargs)

npm run create-user -- owner@yourdomain.com "Owner Name" owner
npm run create-user -- staff@yourdomain.com "Staff Name" staff
```

Each command prints a temporary password — share it with that person directly and have them sign in once.

## Deploying

1. Push this project to a GitHub repository.
2. In Vercel, choose **Import Git Repository** and select it.
3. Add all four environment variables from `.env.local` in Vercel's **Settings → Environment Variables** — including `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY`, since both are genuinely needed server-side in production, not just locally.
4. Deploy.

## What isn't built yet

Real, known gaps — not oversights:

- **Payment processing.** Nothing here actually charges a card yet. This needs a real PayMongo or Xendit merchant account first, which only the business itself can set up.
- **Refunds.** Depends on payment processing existing first.
- **Automated emails** — a receipt to the guest's inbox, a real password-reset email, anything sent automatically. Right now the only receipt a guest gets is the PDF they download themselves in the browser right after booking. Sending real email needs a custom domain and a transactional email provider (Resend) connected — both still pending setup.
- **Real photography.** Every image on the guest site is a placeholder box — no actual photos of the property exist in the system yet.

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
