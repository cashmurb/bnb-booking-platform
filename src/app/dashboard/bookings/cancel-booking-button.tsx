"use client";

import { useState, useTransition } from "react";
import { cancelBooking } from "./actions";

export function CancelBookingButton({
  bookingId,
  guestName,
}: {
  bookingId: string;
  guestName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-red-600 hover:text-red-800"
      >
        Cancel booking
      </button>
    );
  }

  const trimmedReason = reason.trim();

  return (
    <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-800">
        Cancel {guestName}&apos;s booking? This immediately frees the room/vehicle and driver slot for other bookings. This can&apos;t be undone.
      </p>
      <label className="mb-1 mt-2 block text-xs font-medium text-red-800">
        Reason (sent to the guest by email)
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Property closed due to unforseen events. We're so sorry for the inconvenience."
        rows={2}
        className="w-full rounded-md border border-red-200 px-2 py-1.5 text-sm focus:border-red-400 focus:outline-none"
      />
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          disabled={isPending || trimmedReason.length === 0}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await cancelBooking(bookingId, trimmedReason);
              } catch (e) {
                setError(e instanceof Error ? e.message : "Something went wrong.");
              }
            })
          }
          className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "Cancelling…" : "Yes, cancel it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100"
        >
          Never mind
        </button>
      </div>
    </div>
  );
}
