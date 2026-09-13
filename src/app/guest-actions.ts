"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendBookingConfirmationEmail } from "@/lib/booking-emails";
import type {
  Resource,
  DriverWindow,
  SyncHoldInput,
  SyncHoldResult,
  ConfirmResult,
  UpdateHoldDetailsResult,
} from "@/lib/types";

const HOLD_COOKIE = "wnj_guest_hold_id";
const COOKIE_MAX_AGE_SECONDS = 15 * 60;

export async function getRooms(): Promise<Resource[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select(
      "id, type, label, is_active, nightly_rate_php, base_occupancy, max_occupancy, extra_guest_fee_php, cleaning_fee_php, overview, amenities"
    )
    .eq("is_active", true)
    .in("type", ["room_2br", "room_studio"])
    .order("nightly_rate_php");
  return (data as Resource[]) ?? [];
}

export async function getDriverWindowOptions(): Promise<DriverWindow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("driver_windows")
    .select(
      "id, label, start_time, end_time, price_php, sort_order, spans_midnight"
    )
    .order("sort_order");
  return (data as DriverWindow[]) ?? [];
}

function parseOccupiedDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "get_occupied_dates" in item) {
      return String((item as Record<string, unknown>).get_occupied_dates);
    }
    return String(item);
  });
}

export async function checkOccupiedDates(
  resourceId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<{ dates: string[]; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_occupied_dates", {
    p_resource_id: resourceId,
    p_range_start: rangeStart,
    p_range_end: rangeEnd,
  });

  if (error) {
    return { dates: [], error: error.message };
  }
  return { dates: parseOccupiedDates(data), error: null };
}

export async function syncHold(input: SyncHoldInput): Promise<SyncHoldResult> {
  for (const slot of input.driverSlots) {
    if (!slot.windowId || !slot.slotDate) {
      return {
        hold: null,
        error: "Every pickup you add needs a time window and a date.",
      };
    }
  }

  const supabase = await createClient();
  const cookieStore = await cookies();
  const existingHoldId = cookieStore.get(HOLD_COOKIE)?.value;

  if (existingHoldId) {
    await supabase.rpc("cancel_guest_hold", { p_booking_id: existingHoldId });
  }

  const { data, error } = await supabase.rpc("create_guest_hold", {
    p_guest_name: input.guestName,
    p_guest_contact: input.guestContact,
    p_guest_count: input.guestCount,
    p_resource_claims: [
      {
        resource_id: input.room.resourceId,
        start_date: input.room.startDate,
        end_date: input.room.endDate,
      },
    ],
    p_driver_claims: input.driverSlots.map((d) => ({
      window_id: d.windowId,
      slot_date: d.slotDate,
    })),
  });

  if (error || !data) {
    cookieStore.delete(HOLD_COOKIE);
    return { hold: null, error: error?.message ?? "Could not create hold." };
  }

  cookieStore.set(HOLD_COOKIE, data.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
  });

  return {
    hold: {
      id: data.id,
      status: data.status,
      calculatedTotalPhp: Number(data.calculated_total_php),
      finalTotalPhp: Number(data.final_total_php),
      holdExpiresAt: data.hold_expires_at,
    },
    error: null,
  };
}

export async function releaseCurrentHold(): Promise<void> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const existingHoldId = cookieStore.get(HOLD_COOKIE)?.value;

  if (existingHoldId) {
    await supabase.rpc("cancel_guest_hold", { p_booking_id: existingHoldId });
  }
  cookieStore.delete(HOLD_COOKIE);
}

export async function updateHoldDetails(input: {
  guestEmail: string;
  notes?: string;
  paymentMethod?: string;
}): Promise<UpdateHoldDetailsResult> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const existingHoldId = cookieStore.get(HOLD_COOKIE)?.value;

  if (!existingHoldId) {
    return {
      success: false,
      error: "No booking in progress. Please start again.",
    };
  }

  const { error } = await supabase.rpc("update_guest_hold_details", {
    p_booking_id: existingHoldId,
    p_guest_email: input.guestEmail,
    p_notes: input.notes || null,
    p_payment_method: input.paymentMethod || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function confirmCurrentHold(): Promise<ConfirmResult> {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const existingHoldId = cookieStore.get(HOLD_COOKIE)?.value;

  if (!existingHoldId) {
    return {
      success: false,
      bookingId: null,
      error: "No booking in progress. Please start again.",
    };
  }

  type ConfirmedBookingDetails = {
    id: string;
    guest_name: string;
    guest_email: string | null;
    final_total_php: number | null;
    room_label: string | null;
    start_date: string | null;
    end_date: string | null;
  };

  const { data, error } = await supabase.rpc("confirm_guest_hold", {
    p_booking_id: existingHoldId,
  });

  if (error || !data) {
    return {
      success: false,
      bookingId: null,
      error: error?.message ?? "Could not confirm booking.",
    };
  }

  const booking = data as unknown as ConfirmedBookingDetails;

  cookieStore.delete(HOLD_COOKIE);

  await sendBookingConfirmationEmail({
    guestName: booking.guest_name,
    guestEmail: booking.guest_email,
    roomLabel: booking.room_label ?? "your room",
    startDate: booking.start_date ?? "",
    endDate: booking.end_date ?? "",
    totalPhp: booking.final_total_php,
  });

  return { success: true, bookingId: booking.id, error: null };
}
