"use client";

import { useState, useTransition } from "react";
import { archiveBooking, unarchiveBooking } from "./actions";
import { ArchiveIcon } from "../../icons";

export function ArchiveButton({
  bookingId,
  mode,
}: {
  bookingId: string;
  mode: "archive" | "unarchive";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    startTransition(async () => {
      setError(null);
      try {
        if (mode === "archive") {
          await archiveBooking(bookingId);
        } else {
          await unarchiveBooking(bookingId);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  if (mode === "unarchive") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="guest-btn rounded-md border border-guest-border px-3 py-1.5 text-xs text-guest-ink hover:bg-guest-band disabled:opacity-50"
      >
        {isPending ? "Restoring…" : "Unarchive"}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-label="Archive booking"
        title="Archive"
        className="guest-btn flex h-8 w-8 items-center justify-center rounded-md text-guest-muted hover:bg-guest-band hover:text-guest-ink disabled:opacity-50"
      >
        <ArchiveIcon className="h-4 w-4" />
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
