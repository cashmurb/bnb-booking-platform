"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
  });

  if (error) {
    // Surfaced via the thrown error — the client component below catches
    // this and shows it inline rather than crashing the page.
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
  // Cancellation cascade-deletes any pending task for this booking (see
  // migration 0006) — that's a different page's data going stale too.
  revalidatePath("/dashboard/tasks");
}

export async function archiveBooking(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("archive_booking", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/bookings/archive");
}

export async function unarchiveBooking(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("unarchive_booking", {
    p_booking_id: bookingId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/bookings/archive");
}
