"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { login, type LoginState } from "./actions";
import { AuthBackground } from "../auth-background";

const initialState: LoginState = { error: null };

function DeactivatedNotice() {
  const searchParams = useSearchParams();
  if (searchParams.get("deactivated") !== "1") return null;

  return (
    <p className="mb-4 rounded-md bg-white/15 p-3 text-center text-sm text-white">
      This account has been deactivated. Contact the Owner if you believe
      this is a mistake.
    </p>
  );
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <AuthBackground>
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/15 bg-white/10 p-8 shadow-2xl backdrop-blur-lg">
        <div className="mb-6 text-center">
          <h2 className="text-lg font-normal text-white">Login</h2>
          <p className="mt-1 text-sm text-white/60">Nice to see you again!</p>
        </div>

        <Suspense fallback={null}>
          <DeactivatedNotice />
        </Suspense>

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

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-white/80"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link
            href="/forgot-password"
            className="text-xs text-white/60 hover:text-white/90"
          >
            Forgot Password?
          </Link>
        </div>
      </div>
    </AuthBackground>
  );
}
