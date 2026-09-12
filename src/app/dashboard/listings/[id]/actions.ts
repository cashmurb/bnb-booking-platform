"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";

export type UpdateListingState = { error: string | null; success: boolean };

export async function updateListing(
  resourceId: string,
  _prevState: UpdateListingState,
  formData: FormData
): Promise<UpdateListingState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not signed in.", success: false };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { error: "Only the Owner can edit listings.", success: false };
  }

  const label = (formData.get("label") as string | null)?.trim();
  const nightlyRate = formData.get("nightly_rate_php") as string | null;
  const baseOccupancy = formData.get("base_occupancy") as string | null;
  const maxOccupancy = formData.get("max_occupancy") as string | null;
  const extraGuestFee = formData.get("extra_guest_fee_php") as string | null;
  const cleaningFee = formData.get("cleaning_fee_php") as string | null;
  const overview = (formData.get("overview") as string | null) ?? "";
  const amenitiesRaw = (formData.get("amenities") as string | null) ?? "";
  const isActive = formData.get("is_active") === "active";

  if (!label) {
    return { error: "Listing name can't be empty.", success: false };
  }

  const amenities = amenitiesRaw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("resources")
    .update({
      label,
      nightly_rate_php: nightlyRate ? Number(nightlyRate) : null,
      base_occupancy: baseOccupancy ? Number(baseOccupancy) : null,
      max_occupancy: maxOccupancy ? Number(maxOccupancy) : null,
      extra_guest_fee_php: extraGuestFee ? Number(extraGuestFee) : null,
      cleaning_fee_php: cleaningFee ? Number(cleaningFee) : null,
      overview: overview || null,
      amenities: amenities.length > 0 ? amenities : null,
      is_active: isActive,
    })
    .eq("id", resourceId);

  if (error) {
    return { error: error.message, success: false };
  }

  revalidatePath("/dashboard/listings");
  revalidatePath(`/dashboard/listings/${resourceId}`);
  revalidatePath("/rooms");
  revalidatePath(`/rooms/${slugify(label)}`);

  return { error: null, success: true };
}
