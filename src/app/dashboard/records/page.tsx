import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";
import { VerifyPaymentButton } from "./verify-payment-button";

type RecordRow = {
  id: string;
  guest_name: string;
  payment_method: string | null;
  payment_verified: boolean;
  resource_bookings: {
    start_date: string;
    end_date: string;
    resources: { label: string } | null;
  }[];
};

const PAYMENT_LABELS: Record<string, string> = {
  card: "Card",
  gcash: "GCash",
  bank_transfer: "Bank Transfer",
};

export default async function RecordsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect("/dashboard");
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id, guest_name, payment_method, payment_verified,
      resource_bookings ( start_date, end_date, resources ( label ) )
    `
    )
    .eq("status", "confirmed")
    .order("created_at", { ascending: false });

  const rows = (bookings as unknown as RecordRow[] | null) ?? [];

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar />
        <div className="ml-auto flex items-center gap-5 text-[13px]">
          <span className="font-semibold text-guest-navy">Records</span>
          <Link href="/dashboard/reports" className="text-[#4a4a4a]">
            Reports
          </Link>
          <div className="h-5 w-px bg-[#ececec]" />
          <ProfileMenu
            name={profile?.full_name ?? user.email ?? "Account"}
            role="Owner"
          />
        </div>
      </div>

      <h1 className="mb-5 text-[26px] font-normal text-guest-ink">
        Guest &amp; Payment Records
      </h1>

      <div className="overflow-hidden rounded-[14px] bg-white">
        <div className="grid grid-cols-[1fr_1fr_1fr_0.9fr_1fr_1.2fr] px-5 py-3.5 text-[11px] uppercase tracking-wide text-[#8a8a8a]">
          <span>Booking Ref</span>
          <span>Guest</span>
          <span>Property</span>
          <span>Dates</span>
          <span>Payment</span>
          <span>Status</span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-guest-muted">
            No confirmed bookings yet.
          </p>
        ) : (
          rows.map((b) => {
            const rb = b.resource_bookings[0];
            return (
              <div
                key={b.id}
                className="grid grid-cols-[1fr_1fr_1fr_0.9fr_1fr_1.2fr] items-center border-t border-[#f0f0f2] px-5 py-3 text-[13px] text-guest-ink"
              >
                <span>{b.id.slice(0, 8).toUpperCase()}</span>
                <span>{b.guest_name}</span>
                <span className="text-guest-muted">
                  {rb?.resources?.label ?? "—"}
                </span>
                <span className="text-guest-muted">
                  {rb
                    ? `${rb.start_date.slice(5)} – ${rb.end_date.slice(5)}`
                    : "—"}
                </span>
                <span className="text-guest-muted">
                  {b.payment_method
                    ? (PAYMENT_LABELS[b.payment_method] ?? b.payment_method)
                    : "—"}
                </span>
                <span>
                  {b.payment_verified ? (
                    <span className="rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] text-[#1e7d3c]">
                      Verified
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[#fff2e0] px-2.5 py-1 text-[11px] text-[#a65c00]">
                        Awaiting verification
                      </span>
                      <VerifyPaymentButton bookingId={b.id} />
                    </div>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
