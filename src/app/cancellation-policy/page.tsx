import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestFooter } from "../guest-footer";
import { ChatWidget } from "../chat-widget";

export default async function CancellationPolicyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <header className="px-6 pt-10 pb-2 text-center">
          <Link href="/" className="text-guest-ink">
            <h1 className="text-[26px] font-bold">WnJ Comfy Homes</h1>
          </Link>
        </header>

        <div className="mx-auto max-w-[700px] px-6 pt-6 pb-16">
          <h2 className="mb-5 text-[22px] font-normal text-guest-ink">
            Cancellation &amp; Refund Policy
          </h2>

          <div className="flex flex-col gap-5 text-sm leading-relaxed text-guest-muted">
            <div>
              <h3 className="mb-1.5 text-[15px] text-guest-ink">
                Free Cancellation
              </h3>
              <p>
                Cancel up to 3 days before check-in for a full refund.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 text-[15px] text-guest-ink">
                No Refund
              </h3>
              <p>
                Cancellations made less than 3 days before check-in, or
                no-shows, are not eligible for a refund.
              </p>
            </div>
            <div>
              <h3 className="mb-1.5 text-[15px] text-guest-ink">
                How Cancellations Are Handled
              </h3>
              <p>
                Cancellations are handled directly by the Owner — message
                us on{" "}
                <a
                  href="https://m.me/wnjservices"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Facebook
                </a>{" "}
                with your booking reference and we&apos;ll take care of
                it from there.
              </p>
            </div>
          </div>

          <Link
            href="/rooms"
            className="guest-btn mt-8 inline-block rounded-md bg-guest-navy px-[22px] py-2.5 text-[13px] text-white"
          >
            Browse Rooms
          </Link>
        </div>
      </main>

      <GuestFooter maxWidthClassName="max-w-[700px]" />
      <ChatWidget />
    </div>
  );
}

