"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ResourceClaimInput, DriverClaimInput } from "@/lib/types";

export type CreateBookingState = { error: string | null };

export async function createManualBooking(
  _prevState: CreateBookingState,
  formData: FormData
): Promise<CreateBookingState> {
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestContact = String(formData.get("guest_contact") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!guestName || !guestContact) {
    return { error: "Guest name and contact are required." };
  }

  const guestCountRaw = String(formData.get("guest_count") ?? "").trim();
  const guestCount = guestCountRaw ? Number(guestCountRaw) : null;

  const finalTotalRaw = String(formData.get("final_total_php") ?? "").trim();
  const finalTotalOverride = finalTotalRaw ? Number(finalTotalRaw) : null;

  if (finalTotalOverride !== null && (Number.isNaN(finalTotalOverride) || finalTotalOverride < 0)) {
    return { error: "Override total must be a valid, non-negative amount." };
  }

  let resourceClaims: ResourceClaimInput[] = [];
  let driverClaims: DriverClaimInput[] = [];

  try {
    resourceClaims = JSON.parse(
      String(formData.get("resource_claims") ?? "[]")
    );
    driverClaims = JSON.parse(String(formData.get("driver_claims") ?? "[]"));
  } catch {
    return {
      error: "Add at least one room to book.",
    };
  }

  const resourceIds = resourceClaims.map((claim) => claim.resource_id);
  const supabase = await createClient();
  const { data: resources, error: resourcesError } = await supabase
    .from("resources")
    .select("id, type")
    .in("id", resourceIds)
    .eq("is_active", true);

  if (resourcesError || resources?.length !== new Set(resourceIds).size) {
    return { error: "One of the selected resources is not available." };
  }

  const resourceTypes = new Map(
    resources.map((resource) => [resource.id, resource.type])
  );
  const roomClaims = resourceClaims.filter((claim) =>
    resourceTypes.get(claim.resource_id)?.startsWith("room_")
  );

  if (roomClaims.length > 1) {
    return {
      error:
        "A booking can only include one room. Create a separate booking for the second room.",
    };
  }
  const roomClaim = roomClaims[0];

  if (
    !roomClaim &&
    resourceClaims.some((claim) =>
      resourceTypes.get(claim.resource_id)?.startsWith("vehicle_")
    )
  ) {
    return { error: "Add a room with stay dates before adding a vehicle." };
  }

  for (const claim of resourceClaims) {
    if (resourceTypes.get(claim.resource_id)?.startsWith("vehicle_")) {
      claim.start_date = roomClaim?.start_date ?? "";
      claim.end_date = roomClaim?.end_date ?? "";
    }

    if (!claim.resource_id || !claim.start_date || !claim.end_date) {
      return { error: "Every room/vehicle row needs a selection and both dates." };
    }
    if (claim.start_date >= claim.end_date) {
      return { error: "Check-out date must be after check-in date." };
    }
  }

  for (const claim of driverClaims) {
    if (!claim.window_id || !claim.slot_date) {
      return { error: "Every driver-slot row needs a window and a date." };
    }
  }

  const { error } = await supabase.rpc("create_booking", {
    p_guest_name: guestName,
    p_guest_contact: guestContact,
    p_status: "confirmed",
    p_notes: notes || null,
    p_guest_count: guestCount,
    p_final_total_php: finalTotalOverride,
    p_resource_claims: resourceClaims,
    p_driver_claims: driverClaims,
  });

  if (error) {
    if (error.message.includes("exclusion constraint")) {
      return {
        error:
          "One of those rooms or vehicles is already booked on chosen dates.",
      };
    }
    if (error.message.includes("duplicate key value") || error.code === "23505") {
      return {
        error: "Driver slot is already taken on that date.",
      };
    }
    return { error: `Couldn't create the booking: ${error.message}` };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/tasks");
  redirect("/dashboard/bookings");
}
