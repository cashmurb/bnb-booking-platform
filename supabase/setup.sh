set -euo pipefail

DB="${PGDATABASE:-wnj_test}"
MIGRATIONS_DIR="$(dirname "$0")/../migrations"

psql -v ON_ERROR_STOP=1 -d postgres -c "DROP DATABASE IF EXISTS $DB;"
psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE $DB;"

psql -v ON_ERROR_STOP=1 -d "$DB" -c "
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_user_meta_data jsonb
  );
"

psql -v ON_ERROR_STOP=1 -d "$DB" << 'EOF'
create extension if not exists pgcrypto;
create extension if not exists pgtap;

-- Mocks auth.uid(): reads a session-local setting the tests set via
-- set_config('test.current_user_id', '<uuid>', true) before each
-- assertion that needs to act as a specific person.
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('test.current_user_id', true), '')::uuid $$;

-- Minimal, schema-accurate mock of Supabase's real storage schema —
-- just enough (id/name/public on buckets; id/bucket_id/name/owner on
-- objects, plus foldername()) to test whether RLS policies on
-- storage.objects are correct, not a full emulation of real Storage's
-- upload/serving behavior.
create schema storage;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid
);
create function storage.foldername(name text) returns text[]
language sql immutable
as $$ select string_to_array(name, '/') $$;
alter table storage.objects enable row level security;
EOF

APPLIED_COUNT=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  if [[ "$(basename "$f")" == "0003_cron.sql" ]]; then
    continue
  fi
  psql -v ON_ERROR_STOP=1 -d "$DB" -f "$f" > /dev/null
  APPLIED_COUNT=$((APPLIED_COUNT + 1))
done

psql -v ON_ERROR_STOP=1 -d "$DB" -c "
  DO \$\$ BEGIN
    CREATE ROLE authenticated;
  EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  DO \$\$ BEGIN
    CREATE ROLE anon;
  EXCEPTION WHEN duplicate_object THEN NULL; END \$\$;
  GRANT USAGE ON SCHEMA auth, public, storage TO authenticated, anon;
  GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
  GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
"

echo "Test database '$DB' ready — $APPLIED_COUNT migrations applied."
