"use server";

import { createClient } from "@/lib/supabase/server";

export type ResetPasswordState = { error: string | null; success: boolean };

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  const password = formData.get("password") as string | null;
  const confirmPassword = formData.get("confirm_password") as string | null;

  if (!password || password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      success: false,
    };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords don't match.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}