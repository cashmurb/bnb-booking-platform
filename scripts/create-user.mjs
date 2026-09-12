import { createClient } from "@supabase/supabase-js";

const [, , email, fullName, role] = process.argv;

if (!email || !fullName || !role) {
  console.error(
    'Usage: node scripts/create-user.mjs <email> "<full name>" <owner|staff>'
  );
  process.exit(1);
}

if (role !== "owner" && role !== "staff") {
  console.error('Role must be exactly "owner" or "staff".');
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your " +
      "shell before running this (see .env.example)."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tempPassword = crypto.randomUUID().slice(0, 16);

const { error } = await supabase.auth.admin.createUser({
  email,
  password: tempPassword,
  email_confirm: true,
  user_metadata: { full_name: fullName, role },
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

console.log(`Created ${role} account for ${fullName} <${email}>.`);
console.log(`Temporary password: ${tempPassword}`);
console.log(
  "Share this with them securely and have them sign in once — a " +
    "password-change/reset flow is not built yet (not needed for a " +
    "2-person system to start; add one before this goes further if it " +
    "becomes annoying)."
);
