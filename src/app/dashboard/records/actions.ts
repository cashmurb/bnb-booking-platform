"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function verifyPayment(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_payment_verified", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/records");
}
