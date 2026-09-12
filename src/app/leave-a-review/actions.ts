"use server";

import { createClient } from "@/lib/supabase/server";

export type SubmitReviewState = { error: string | null; success: boolean };

export async function submitReview(
  _prevState: SubmitReviewState,
  formData: FormData
): Promise<SubmitReviewState> {
  const bookingReference = (
    formData.get("booking_reference") as string | null
  )?.trim();
  const ratingRaw = formData.get("rating") as string | null;
  const comment = (formData.get("comment") as string | null)?.trim();

  if (!bookingReference) {
    return { error: "Enter your booking reference.", success: false };
  }
  const rating = ratingRaw ? Number(ratingRaw) : null;
  if (!rating) {
    return { error: "Pick a star rating.", success: false };
  }
  if (!comment) {
    return { error: "Write a bit about your stay.", success: false };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_review", {
    p_booking_reference: bookingReference,
    p_rating: rating,
    p_comment: comment,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
