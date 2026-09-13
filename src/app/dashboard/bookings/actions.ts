"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendCancellationEmail } from "@/lib/booking-emails";

export async function cancelBooking(bookingId: string, reason: string) {
  const supabase = await createClient();

  type BookingWithDetails = {
    guest_name: string;
    guest_email: string | null;
    resource_bookings: {
      start_date: string;
      end_date: string;
      resources: { label: string } | null;
    }[];
  };

  const { data: bookingRaw } = await supabase
    .from("bookings")
    .select(
      "guest_name, guest_email, resource_bookings(start_date, end_date, resources(label))"
    )
    .eq("id", bookingId)
    .single();

  const booking = bookingRaw as unknown as BookingWithDetails | null;

  const { error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
    p_reason: reason,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (booking) {
    const rb = booking.resource_bookings?.[0];
    await sendCancellationEmail({
      guestName: booking.guest_name,
      guestEmail: booking.guest_email,
      roomLabel: rb?.resources?.label ?? "your room",
      startDate: rb?.start_date ?? "",
      endDate: rb?.end_date ?? "",
      totalPhp: null,
      reason,
    });
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath(`/dashboard/bookings/${bookingId}`);
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
