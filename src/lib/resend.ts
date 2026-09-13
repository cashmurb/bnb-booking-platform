import { Resend } from "resend";

let cachedClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!cachedClient) {
    cachedClient = new Resend(process.env.RESEND_API_KEY);
  }
  return cachedClient;
}

export const RESEND_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "WnJ Comfy Homes <onboarding@resend.dev>";
