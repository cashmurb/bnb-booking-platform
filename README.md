# WnJ Comfy Homes

A booking website and management dashboard for a family-run B&B and tour business. 

Guests can browse and book online. Owners and staff manage bookings, cleaning and driver tasks, pricing, reviews, and reports from a private dashboard. 

## Stack 

- **Next.js 16** (App Router) - guest site + dashboard
- **Supabase** - Postgres, Auth, RLS
- **Vercel** - hosting
- **Resend** - transactional email
- **Google Gemini** - AI FAQ chat / owner assistant 

## Getting started 
```
npm install
cp .env.example .env.local
npm run dev
```
Open http://localhost:3000

## Database 
This requires the Supabase CLI.
```
supabase start
supabase db reset # to apply migration and seed 
```
Commit new schema changes as migrations in supabase/migrations/

## Environment variables 
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- GEMINI_API_KEY

## Deployment
This is deployed on Vercel. Set production env vars in the Vercel project, then apply the migrations:
```
supabase db push
```
Verify the Resend sending domain and Supabase auth redirect URLs for the production domain. 

## Documentation
See docs/architecture.md for stack roles, data model, auth/roles, and key flows.

## Access 
The guest site is public. The dashboard is private, protected by Supabase Auth and RLS. 

