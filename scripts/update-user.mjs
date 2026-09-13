import { createClient } from "@supabase/supabase-js";

const [, , email, fullName, role] = process.argv;

if (!email || !fullName || !role) {
  console.error(
    'Usage: node scripts/update-user.mjs <email> "<full name>" <owner|staff>'
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
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your shell."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// 1. Find the user by email
const { data, error: listError } = await supabase.auth.admin.listUsers({
  perPage: 1000,
});

if (listError) {
  console.error("Failed to list users:", listError.message);
  process.exit(1);
}

const user = data.users.find(
  (u) => u.email?.toLowerCase() === email.toLowerCase()
);

if (!user) {
  console.error(`No user found with email ${email}.`);
  process.exit(1);
}

// 2. Update auth metadata
const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
  user_metadata: { full_name: fullName, role },
});

if (authError) {
  console.error("Failed to update auth metadata:", authError.message);
  process.exit(1);
}

// 3. Update the profiles table (this is what the site reads from)
const { error: profileError } = await supabase
  .from("profiles")
  .update({ role, full_name: fullName })
  .eq("id", user.id);

if (profileError) {
  console.error("Failed to update profiles table:", profileError.message);
  process.exit(1);
}

console.log(`Updated ${role} account for ${fullName} <${email}>.`);
console.log("Remember: the user must sign out and back in for JWT to refresh.");