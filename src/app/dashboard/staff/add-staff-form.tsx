"use client";

import { useActionState, useState } from "react";
import { createStaffAccount, type CreateStaffState } from "./actions";

const initialState: CreateStaffState = { error: null, success: null };

export function AddStaffForm() {
  const [state, formAction, pending] = useActionState(
    createStaffAccount,
    initialState
  );
  const [open, setOpen] = useState(false);

  if (state.success) {
    return (
      <div className="rounded-[14px] bg-white p-6">
        <h3 className="mb-1 text-base font-normal text-guest-ink">
          Staff account created
        </h3>
        <p className="mb-4 text-sm text-guest-muted">
          Share this password with {state.success.fullName} directly and have them sign in once. It won&apos;t be shown again. There&apos;s no
          password-reset flow yet, so if it&apos;s lost, a new account is the only fix for now.
        </p>
        <div className="rounded-lg bg-guest-band p-4 text-sm">
          <div className="mb-2">
            <span className="text-guest-muted">Email: </span>
            <span className="font-semibold">{state.success.email}</span>
          </div>
          <div>
            <span className="text-guest-muted">Temporary password: </span>
            <span className="font-mono font-semibold">
              {state.success.tempPassword}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-guest-navy underline"
        >
          Done
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-guest-navy px-[22px] py-2.5 text-[13px] font-semibold text-white"
      >
        + Add Staff
      </button>
    );
  }

  return (
    <div className="rounded-[14px] bg-white p-6">
      <h3 className="mb-4 text-base font-normal text-guest-ink">
        Add a staff account
      </h3>
      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="full_name"
            className="block text-sm font-medium text-guest-ink"
          >
            Full name
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="mt-1 w-full max-w-sm rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-guest-ink"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full max-w-sm rounded-md border border-guest-border px-3 py-2 text-sm focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="guest-btn rounded-md bg-guest-navy px-4 py-2 text-sm font-medium text-white hover:bg-guest-navy-dark disabled:opacity-50"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-guest-border px-4 py-2 text-sm text-guest-ink hover:bg-guest-band"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
