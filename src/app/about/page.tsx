import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestFooter } from "../guest-footer";
import { ChatWidget } from "../chat-widget";

export default async function AboutPage() {
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
        <header className="px-6 pt-14 pb-10 text-center">
          <Link href="/" className="text-guest-ink">
            <h1 className="text-[28px] font-bold">WnJ Comfy Homes</h1>
          </Link>
        </header>

        <div className="mx-auto mb-14 max-w-[800px] px-6 text-center">
          <p className="mx-auto max-w-[520px] text-[14px] leading-relaxed text-guest-muted">
            We are a family-run vacation rental business on Mactan Island, providing comfortable, convenient and safe stays.
          </p>
        </div>

        <section className="mx-auto mb-14 max-w-[800px] px-6">
          <h2 className="mb-3 text-[20px] font-normal text-guest-ink">
            Our Story
          </h2>
          <p className="text-[13px] leading-relaxed text-guest-muted">
            WnJ Comfy Homes started with a simple idea: give travelers a clean, well-located place to stay while enjoying the comfort and convenience of a home. 
            We began with three comfy homes, and today, we continue to provide a welcoming experience for guests from around the world, letting you enjoy Cebu to the fullest, just like a local.
          </p>
        </section>

        <div className="mx-auto mb-16 grid max-w-[800px] grid-cols-1 gap-8 px-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[16px] font-normal text-guest-ink">
              Our Mission
            </h3>
            <p className="text-[12px] leading-relaxed text-guest-muted">
              To make every guest feel at home, wherever they&apos;re staying with us.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-[16px] font-normal text-guest-ink">
              Our Promise
            </h3>
            <p className="text-[12px] leading-relaxed text-guest-muted">
              Clean, comfortable rooms and responsive support before, during and after your stay.
            </p>
          </div>
        </div>
      </main>

      <GuestFooter maxWidthClassName="max-w-[800px]" />
      <ChatWidget />
    </div>
  );
}