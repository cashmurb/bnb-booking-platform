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

const [bookingsResult, tasksCompletedResult, tasksStartedResult] =
  await Promise.all([
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("completed_by", user.id),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("started_by", user.id),
  ]);

const bookingsCount = bookingsResult.count ?? 0;
const tasksCount =
  (tasksCompletedResult.count ?? 0) + (tasksStartedResult.count ?? 0);

if (bookingsCount > 0 || tasksCount > 0) {
  console.error(
    `Cannot delete this account — it has real history attached: ` +
      `${bookingsCount} booking(s) created, ${tasksCount} task(s) ` +
      `completed or started. Deleting it would fail anyway (a database ` +
      `constraint blocks it), but more importantly, deleting it would ` +
      `also erase who really did that work.\n\n` +
      `Use "Deactivate Staff" in the dashboard instead — it blocks this ` +
      `person from signing in going forward while keeping their history ` +
      `intact.`
  );
  process.exit(1);
}

const { error } = await supabase.auth.admin.deleteUser(user.id);

if (error) {
  console.error("Failed to delete user:", error.message);
  process.exit(1);
}

console.log(`Deleted user ${email}.`);