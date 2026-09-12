"use client";

import { useState, useTransition } from "react";
import { startTask, completeTask, reopenTask } from "./actions";
import type { TaskStatus } from "@/lib/types";

export function TaskActionButton({
  taskId,
  status,
}: {
  taskId: string;
  status: TaskStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    startTransition(async () => {
      setError(null);
      try {
        if (status === "pending") {
          await startTask(taskId);
        } else if (status === "in_progress") {
          await completeTask(taskId);
        } else {
          await reopenTask(taskId);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  const label = isPending
    ? "Saving…"
    : status === "pending"
      ? "Start"
      : status === "in_progress"
        ? "Mark done"
        : "Reopen";

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          status === "done"
            ? "text-sm text-guest-muted underline hover:text-guest-ink disabled:opacity-50"
            : "guest-btn flex-none rounded-md bg-guest-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-guest-navy-dark disabled:opacity-50"
        }
      >
        {label}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
