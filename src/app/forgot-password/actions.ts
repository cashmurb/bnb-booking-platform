"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type ForgotPasswordState = { error: string | null; sent: boolean };

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = (formData.get("email") as string | null)?.trim();

  if (!email) {
    return { error: "Enter your email.", sent: false };
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });

  if (error) {
    return { error: error.message, sent: false };
  }

  return { error: null, sent: true };
}