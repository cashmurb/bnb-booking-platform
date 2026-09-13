"use client";

import { useState, useTransition } from "react";
import { deactivateStaffAccount, reactivateStaffAccount } from "./actions";

export function StaffStatusButton({
  userId,
  mode,
}: {
  userId: string;
  mode: "deactivate" | "reactivate";
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function runAction() {
    setError(null);
    startTransition(async () => {
      const result =
        mode === "deactivate"
          ? await deactivateStaffAccount(userId)
          : await reactivateStaffAccount(userId);
      if (result.error) {
        setError(result.error);
      }
      setConfirming(false);
    });
  }

  if (mode === "reactivate") {
    return (
      <div>
        <button
          type="button"
          onClick={runAction}
          disabled={isPending}
          className="guest-btn rounded-md border border-guest-border px-3 py-1.5 text-xs text-guest-ink hover:bg-guest-band disabled:opacity-50"
        >
          {isPending ? "Reactivating…" : "Reactivate"}
        </button>
        {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-guest-muted">Remove access?</span>
        <button
          type="button"
          onClick={runAction}
          disabled={isPending}
          className="guest-btn rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? "…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-xs text-guest-muted underline"
        >
          Cancel
        </button>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="guest-btn rounded-md border border-guest-border px-3 py-1.5 text-xs text-guest-ink hover:bg-guest-band"
    >
      Deactivate
    </button>
  );
}
