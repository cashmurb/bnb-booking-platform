import { createClient } from "@supabase/supabase-js";

const [, , email] = process.argv;

if (!email) {
  console.error("Usage: node scripts/delete-user.mjs <email>");
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

const { error } = await supabase.auth.admin.deleteUser(user.id);

if (error) {
  console.error("Failed to delete user:", error.message);
  process.exit(1);
}

console.log(`Deleted user ${email}.`);