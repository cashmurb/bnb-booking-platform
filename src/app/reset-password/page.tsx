"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ResetPasswordState } from "./action";
import { AuthBackground } from "../auth-background";

const initialState: ResetPasswordState = { error: null, success: false };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState
  );

  return (
    <AuthBackground>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-normal text-white">
            Set a new password
          </h2>
        </div>

        {state.success ? (
          <div className="text-center">
            <p className="mb-4 rounded-md bg-white/15 p-3 text-sm text-white">
              Password updated.
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-md bg-white px-4 py-2 text-sm font-medium text-guest-navy hover:bg-white/90"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white/80"
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-1 w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium text-white/80"
              >
                Confirm new password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                className="mt-1 w-full rounded-md border border-white/25 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-white/50 focus:outline-none"
              />
            </div>

            {state.error && (
              <p role="alert" className="text-sm text-red-300">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="guest-btn w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-guest-navy hover:bg-white/90 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </AuthBackground>
  );
}
