"use client";

import { useState } from "react";
import { useActionState } from "react";
import { submitReview, type SubmitReviewState } from "./actions";
import { GuestFooter } from "../guest-footer";

const initialState: SubmitReviewState = { error: null, success: false };

export function ReviewForm() {
  const [state, formAction, pending] = useActionState(
    submitReview,
    initialState
  );
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 mx-auto w-full max-w-md px-4 py-16">
        <h1 className="mb-2 text-center font-serif text-2xl text-guest-ink">
          Leave a Review
        </h1>
        <p className="mb-8 text-center text-sm text-guest-muted">
          Find your booking reference on your confirmation receipt.
        </p>

        {state.success ? (
          <p className="rounded-md bg-[#e6f4ea] p-4 text-center text-sm text-[#1e7d3c]">
            Thank you! Your review has been submitted and will appear once
            it&apos;s been reviewed.
          </p>
        ) : (
          <form action={formAction} className="space-y-5">
            <div>
              <label className="mb-1 block text-sm text-guest-ink">
                Booking Reference
              </label>
              <input
                type="text"
                name="booking_reference"
                placeholder="e.g. WNJ2026A"
                required
                className="w-full rounded border border-guest-border px-3 py-2 text-sm uppercase"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-guest-ink">
                Rating
              </label>
              <input type="hidden" name="rating" value={rating} />
              <div className="flex gap-1 text-3xl">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    className={
                      n <= (hoverRating || rating)
                        ? "text-guest-navy"
                        : "text-guest-border"
                    }
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-guest-ink">
                Your Review
              </label>
              <textarea
                name="comment"
                rows={4}
                required
                className="w-full resize-y rounded border border-guest-border px-3 py-2 text-sm"
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-red-600">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="guest-btn w-full rounded bg-guest-navy px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Submitting…" : "Submit Review"}
            </button>
          </form>
        )}
      </main>
      <GuestFooter maxWidthClassName="max-w-md" />
    </div>
  );
}
