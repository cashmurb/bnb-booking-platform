"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type CreateStaffState = {
  error: string | null;
  success: { fullName: string; email: string; tempPassword: string } | null;
};

export async function createStaffAccount(
  _prevState: CreateStaffState,
  formData: FormData
): Promise<CreateStaffState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in.", success: null };
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "owner") {
    return { error: "Only the Owner can add staff accounts.", success: null };
  }

  const fullName = (formData.get("full_name") as string | null)?.trim();
  const email = (formData.get("email") as string | null)?.trim();

  if (!fullName || !email) {
    return { error: "Full name and email are both required.", success: null };
  }

  const tempPassword = crypto.randomUUID().slice(0, 16);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, role: "staff" },
  });

  if (error) {
    return { error: error.message, success: null };
  }

  revalidatePath("/dashboard/staff");

  return {
    error: null,
    success: { fullName, email, tempPassword },
  };
}
