import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";
import { StatsChat } from "./stats-chat";


type BookingRow = {
  final_total_php: number | null;
  payment_verified: boolean;
  resource_bookings: {
    start_date: string;
    end_date: string;
    resources: { label: string } | null;
  }[];
};

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function monthLabel(year: number, monthIndex: number): string {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "short",
  });
}

export default async function ReportsPage() {
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

  const [{ data: bookingsData }, { data: rooms }] = await Promise.all([
    supabase
      .from("bookings")
      .select(
        `
        final_total_php, payment_verified,
        resource_bookings ( start_date, end_date, resources ( label ) )
      `
      )
      .eq("status", "confirmed"),
    supabase
      .from("resources")
      .select("label")
      .eq("is_active", true)
      .in("type", ["room_2br", "room_studio"])
      .order("label"),
  ]);

  const bookings = (bookingsData as unknown as BookingRow[] | null) ?? [];

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonthIndex = now.getMonth();
  const curMonthKey = monthKey(curYear, curMonthIndex);
  const daysThisMonth = new Date(curYear, curMonthIndex + 1, 0).getDate();
  const firstOfThisMonth = new Date(curYear, curMonthIndex, 1);
  const nextMonthStart = new Date(curYear, curMonthIndex + 1, 1);

  // Revenue by check-in month, verified bookings only.
  const revenueByMonth = new Map<string, number>();
  // Bookings count this month (by check-in date).
  let bookingsThisMonth = 0;
  // Nights booked per room, clamped to the current month (ALL
  // confirmed bookings — occupancy isn't about payment status).
  const nightsByRoom = new Map<string, number>();

  for (const b of bookings) {
    const rb = b.resource_bookings[0];
    if (!rb) continue;

    const checkInKey = rb.start_date.slice(0, 7);
    if (b.payment_verified && b.final_total_php != null) {
      revenueByMonth.set(
        checkInKey,
        (revenueByMonth.get(checkInKey) ?? 0) + Number(b.final_total_php)
      );
    }
    if (checkInKey === curMonthKey) {
      bookingsThisMonth += 1;
    }

    if (rb.resources) {
      const start = new Date(rb.start_date);
      const end = new Date(rb.end_date);
      const clampedStart = start < firstOfThisMonth ? firstOfThisMonth : start;
      const clampedEnd = end > nextMonthStart ? nextMonthStart : end;
      const nights = Math.max(
        0,
        (clampedEnd.getTime() - clampedStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (nights > 0) {
        const label = rb.resources.label;
        nightsByRoom.set(label, (nightsByRoom.get(label) ?? 0) + nights);
      }
    }
  }

  const revenueThisMonth = revenueByMonth.get(curMonthKey) ?? 0;

  const activeRoomLabels = (rooms ?? []).map((r) => r.label);
  const totalBookedNights = activeRoomLabels.reduce(
    (sum, label) => sum + (nightsByRoom.get(label) ?? 0),
    0
  );
  const avgOccupancy =
    activeRoomLabels.length > 0
      ? Math.round(
          (totalBookedNights / (activeRoomLabels.length * daysThisMonth)) * 100
        )
      : 0;

  // Last 6 months, oldest first, ending at the real current month.
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const offset = 5 - i;
    const d = new Date(curYear, curMonthIndex - offset, 1);
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  });
  const revenueSeries = last6Months.map(({ year, monthIndex }) => ({
    label: monthLabel(year, monthIndex),
    revenue: revenueByMonth.get(monthKey(year, monthIndex)) ?? 0,
  }));
  const maxRevenue = Math.max(1, ...revenueSeries.map((m) => m.revenue));

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar />
        <div className="ml-auto flex items-center gap-5 text-[13px]">
          <Link href="/dashboard/records" className="text-[#4a4a4a]">
            Records
          </Link>
          <span className="font-semibold text-guest-navy">Reports</span>
          <div className="h-5 w-px bg-[#ececec]" />
          <ProfileMenu
            name={profile?.full_name ?? user.email ?? "Account"}
            role="Owner"
          />
        </div>
      </div>

      <h1 className="mb-5 text-[26px] font-normal text-guest-ink">Reports</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-[14px] bg-white p-[18px]">
          <div className="mb-1.5 text-xs text-guest-muted">
            Verified Revenue ({monthLabel(curYear, curMonthIndex)})
          </div>
          <div className="text-2xl text-guest-ink">
            ₱{revenueThisMonth.toLocaleString()}
          </div>
        </div>
        <div className="rounded-[14px] bg-white p-[18px]">
          <div className="mb-1.5 text-xs text-guest-muted">
            Avg. Occupancy
          </div>
          <div className="text-2xl text-guest-ink">{avgOccupancy}%</div>
        </div>
        <div className="rounded-[14px] bg-white p-[18px]">
          <div className="mb-1.5 text-xs text-guest-muted">
            Bookings ({monthLabel(curYear, curMonthIndex)})
          </div>
          <div className="text-2xl text-guest-ink">{bookingsThisMonth}</div>
        </div>
      </div>

      <h2 className="mb-3 text-base font-normal text-guest-ink">
        Verified Revenue by Month
      </h2>
      <div className="mb-6 flex h-[200px] items-end gap-3.5 rounded-[14px] bg-white p-5 pb-2">
        {revenueSeries.map((m, i) => (
          <div
            key={i}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className={`w-full rounded-t-lg ${
                i === revenueSeries.length - 1
                  ? "bg-guest-navy"
                  : "bg-[#c9d3f0]"
              }`}
              style={{
                height: `${Math.max(4, (m.revenue / maxRevenue) * 100)}%`,
              }}
              title={`₱${m.revenue.toLocaleString()}`}
            />
            <div className="text-[11px] text-guest-muted">{m.label}</div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-base font-normal text-guest-ink">
        Occupancy by Listing ({monthLabel(curYear, curMonthIndex)})
      </h2>
      <div className="flex flex-col gap-4 rounded-[14px] bg-white p-5">
        {activeRoomLabels.length === 0 ? (
          <p className="text-sm text-guest-muted">No active listings.</p>
        ) : (
          activeRoomLabels.map((label) => {
            const nights = nightsByRoom.get(label) ?? 0;
            const pct = Math.round((nights / daysThisMonth) * 100);
            return (
              <div key={label}>
                <div className="mb-1.5 flex justify-between text-[13px]">
                  <span>{label}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#f0f0f2]">
                  <div
                    className="h-full bg-guest-navy"
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-6">
        <StatsChat />
      </div>
    </main>
  );
}