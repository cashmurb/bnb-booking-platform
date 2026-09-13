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
    .select("full_name, role, avatar_path")
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
          <div className="hidden items-center gap-5 lg:flex">
            <span className="font-semibold text-guest-navy">Records</span>
            <Link href="/dashboard/reports" className="text-[#4a4a4a]">
              Reports
            </Link>
            <div className="h-5 w-px bg-[#ececec]" />
          </div>
          <ProfileMenu
            name={profile?.full_name ?? user.email ?? "Account"}
            avatarUrl={
              profile?.avatar_path
                ? supabase.storage
                    .from("avatars")
                    .getPublicUrl(profile.avatar_path).data.publicUrl
                : null
            }
            role="Owner"
          />
        </div>
      </div>

      <h1 className="mb-5 text-[26px] font-normal text-guest-ink">
        Guest &amp; Payment Records
      </h1>

      <div className="overflow-hidden rounded-[14px] bg-white">
        <div className="hidden grid-cols-[1fr_1fr_1fr_0.9fr_1fr_1.2fr] px-5 py-3.5 text-[11px] uppercase tracking-wide text-[#8a8a8a] lg:grid">
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
            const paymentLabel = b.payment_method
              ? (PAYMENT_LABELS[b.payment_method] ?? b.payment_method)
              : "—";
            const statusBadge = b.payment_verified ? (
              <span className="rounded-full bg-[#e6f4ea] px-2.5 py-1 text-[11px] text-[#1e7d3c]">
                Verified
              </span>
            ) : (
              <span className="rounded-full bg-[#fff2e0] px-2.5 py-1 text-[11px] text-[#a65c00]">
                Awaiting verification
              </span>
            );

            return (
              <div key={b.id} className="border-t border-[#f0f0f2]">
                {/* Desktop: original table row, unchanged */}
                <div className="hidden grid-cols-[1fr_1fr_1fr_0.9fr_1fr_1.2fr] items-center px-5 py-3 text-[13px] text-guest-ink lg:grid">
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
                  <span className="text-guest-muted">{paymentLabel}</span>
                  <span>
                    {b.payment_verified ? (
                      statusBadge
                    ) : (
                      <div className="flex items-center gap-2">
                        {statusBadge}
                        <VerifyPaymentButton bookingId={b.id} />
                      </div>
                    )}
                  </span>
                </div>

                <div className="p-4 lg:hidden">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-guest-ink">
                      {b.guest_name}
                    </span>
                    <span className="flex-none text-xs text-guest-muted">
                      {b.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-guest-muted">
                    {rb?.resources?.label ?? "—"}
                    {rb
                      ? ` · ${rb.start_date.slice(5)} – ${rb.end_date.slice(5)}`
                      : ""}
                  </p>
                  <p className="text-xs text-guest-muted">{paymentLabel}</p>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    {statusBadge}
                    {!b.payment_verified && (
                      <VerifyPaymentButton bookingId={b.id} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

