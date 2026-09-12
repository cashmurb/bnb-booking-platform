"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function approveReview(reviewId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_review", {
    p_review_id: reviewId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/");
}
