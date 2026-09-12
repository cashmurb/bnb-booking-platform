"use client";

import { useState, useTransition } from "react";
import { approveReview } from "./actions";

export function ApproveReviewButton({ reviewId }: { reviewId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      setError(null);
      try {
        await approveReview(reviewId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="guest-btn rounded-md bg-guest-navy px-2.5 py-1 text-[11px] text-white disabled:opacity-50"
      >
        {isPending ? "Approving…" : "Approve"}
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
