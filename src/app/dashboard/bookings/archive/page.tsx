import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "../../search-bar";
import { ProfileMenu } from "../../profile-menu";
import { ArchiveButton } from "../archive-button";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-[#e6f4ea] text-[#1e7d3c]",
  held: "bg-amber-100 text-amber-800",
  expired: "bg-stone-100 text-stone-500",
  cancelled: "bg-red-100 text-red-700",
};

type BookingRow = {
  id: string;
  status: string;
  guest_name: string;
  final_total_php: number | null;
  resource_bookings: {
    start_date: string;
    end_date: string;
    resources: { label: string } | null;
  }[];
};

export default async function ArchivedBookingsPage() {
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

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      `
      id, status, guest_name, final_total_php,
      resource_bookings ( start_date, end_date, resources ( label ) )
    `
    )
    .eq("archived", true)
    .order("created_at", { ascending: false });

  const rows = (bookings as unknown as BookingRow[] | null) ?? [];

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar />
        <div className="ml-auto flex items-center gap-5 text-[13px]">
          <Link href="/dashboard/records" className="text-[#4a4a4a]">
            Records
          </Link>
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

      <div className="mb-5 flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/bookings"
            className="text-xs text-guest-muted"
          >
            ← Back to Bookings Management
          </Link>
          <h1 className="mt-2 text-[26px] font-normal text-guest-ink">
            Archived Bookings
          </h1>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load archived bookings: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-[14px] bg-white">
        <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] px-5 py-3.5 text-xs text-[#4a4a4a]">
          <span>Guest Name</span>
          <span>Room</span>
          <span>Date</span>
          <span>Status</span>
          <span>Total Amount</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-guest-muted">
            Nothing archived yet.
          </p>
        ) : (
          rows.map((b) => {
            const rb = b.resource_bookings[0];
            return (
              <div
                key={b.id}
                className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] items-center border-t border-[#f0f0f2] px-5 py-3 text-[13px] text-guest-ink"
              >
                <Link
                  href={`/dashboard/bookings/${b.id}`}
                  className="contents"
                >
                  <span className="font-medium">{b.guest_name}</span>
                  <span className="text-guest-muted">
                    {rb?.resources?.label ?? "—"}
                  </span>
                  <span className="text-guest-muted">
                    {rb ? `${rb.start_date} → ${rb.end_date}` : "—"}
                  </span>
                  <span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        STATUS_STYLES[b.status] ?? "bg-stone-100 text-stone-600"
                      }`}
                    >
                      {b.status}
                    </span>
                  </span>
                  <span className="font-medium">
                    {b.final_total_php != null
                      ? `₱${Number(b.final_total_php).toFixed(2)}`
                      : "—"}
                  </span>
                </Link>
                <ArchiveButton bookingId={b.id} mode="unarchive" />
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
