"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  type ForgotPasswordState,
} from "./actions";
import { AuthBackground } from "../auth-background";

const initialState: ForgotPasswordState = { error: null, sent: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState
  );

  return (
    <AuthBackground>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-normal text-white">
            Reset your password
          </h2>
          <p className="mt-1 text-sm text-white/60">
            We&apos;ll email you a link to set a new one.
          </p>
        </div>

        {state.sent ? (
          <p className="rounded-md bg-white/15 p-3 text-sm text-white">
            If an account exists for that email, a reset link is on its way.
            Check your inbox.
          </p>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white/80"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
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
              {pending ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-white/60 hover:text-white/90"
        >
          ← Back to sign in
        </Link>
      </div>
    </AuthBackground>
  );
}
