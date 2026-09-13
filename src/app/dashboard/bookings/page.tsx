import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";
import { ArchiveButton } from "./archive-button";

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

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

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

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      `
      id, status, guest_name, final_total_php,
      resource_bookings ( start_date, end_date, resources ( label ) )
    `
    )
    .eq("archived", false)
    .order("created_at", { ascending: false });

  if (query) {
    bookingsQuery = bookingsQuery.ilike("guest_name", `%${query}%`);
  }

  const { data: bookings, error } = await bookingsQuery;

  const rows = (bookings as unknown as BookingRow[] | null) ?? [];

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar defaultValue={query} />
        <div className="ml-auto flex items-center gap-5 text-[13px]">
          <div className="hidden items-center gap-5 lg:flex">
            <Link href="/dashboard/records" className="text-[#4a4a4a]">
              Records
            </Link>
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

      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-[26px] font-normal text-guest-ink">
          Bookings Management
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/bookings/archive"
            className="rounded-lg border border-guest-border px-[18px] py-2.5 text-[13px] text-guest-ink hover:bg-guest-band"
          >
            View Archive
          </Link>
          <Link
            href="/dashboard/bookings/new"
            className="rounded-lg bg-guest-navy px-[22px] py-2.5 text-[13px] font-semibold text-white"
          >
            + New Booking
          </Link>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load bookings: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-[14px] bg-white">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] px-5 py-3.5 text-xs text-[#4a4a4a] lg:grid">
          <span>Guest Name</span>
          <span>Room</span>
          <span>Date</span>
          <span>Status</span>
          <span>Total Amount</span>
          <span></span>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-guest-muted">
            {query ? (
              <>No bookings match &ldquo;{query}&rdquo;.</>
            ) : (
              <>
                No bookings yet.{" "}
                <Link href="/dashboard/bookings/new" className="underline">
                  Create the first one
                </Link>
                .
              </>
            )}
          </p>
        ) : (
          rows.map((b) => {
            const rb = b.resource_bookings[0];
            const statusBadge = (
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                  STATUS_STYLES[b.status] ?? "bg-stone-100 text-stone-600"
                }`}
              >
                {b.status}
              </span>
            );
            const total =
              b.final_total_php != null
                ? `₱${Number(b.final_total_php).toFixed(2)}`
                : "—";

            return (
              <div key={b.id} className="border-t border-[#f0f0f2]">
                {/* Desktop: original table row, unchanged */}
                <div className="hidden grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto] items-center px-5 py-3 text-[13px] text-guest-ink hover:bg-[#fafafa] lg:grid">
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
                    <span>{statusBadge}</span>
                    <span className="font-medium">{total}</span>
                  </Link>
                  <ArchiveButton bookingId={b.id} mode="archive" />
                </div>

                <div className="p-4 lg:hidden">
                  <Link href={`/dashboard/bookings/${b.id}`} className="block">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-guest-ink">
                        {b.guest_name}
                      </span>
                      <span className="flex-none">{statusBadge}</span>
                    </div>
                    <p className="mt-1 text-xs text-guest-muted">
                      {rb?.resources?.label ?? "—"}
                    </p>
                    <p className="text-xs text-guest-muted">
                      {rb ? `${rb.start_date} → ${rb.end_date}` : "—"}
                    </p>
                  </Link>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-guest-ink">
                      {total}
                    </span>
                    <ArchiveButton bookingId={b.id} mode="archive" />
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
