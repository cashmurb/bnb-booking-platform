import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type BookingRow = {
  final_total_php: number | null;
  payment_verified: boolean;
  resource_bookings: {
    start_date: string;
    end_date: string;
    resources: { label: string } | null;
  }[];
};

export type MonthStats = {
  monthLabel: string; // e.g. "March 2026"
  revenuePhp: number;
  bookingsCount: number;
  occupancyByRoom: Record<string, number>; // room label -> percent
};

const MONTHS_OF_HISTORY = 12;

export async function getStatsHistory(
  supabase: SupabaseServerClient
): Promise<MonthStats[]> {
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
  const activeRoomLabels = (rooms ?? []).map((r) => r.label);

  const now = new Date();
  const months: { year: number; monthIndex: number }[] = [];
  for (let i = MONTHS_OF_HISTORY - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), monthIndex: d.getMonth() });
  }

  const history: MonthStats[] = months.map(({ year, monthIndex }) => {
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const firstOfMonth = new Date(year, monthIndex, 1);
    const nextMonthStart = new Date(year, monthIndex + 1, 1);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let revenuePhp = 0;
    let bookingsCount = 0;
    const nightsByRoom = new Map<string, number>();

    for (const b of bookings) {
      const rb = b.resource_bookings[0];
      if (!rb) continue;

      const checkInKey = rb.start_date.slice(0, 7);
      if (
        checkInKey === monthKey &&
        b.payment_verified &&
        b.final_total_php != null
      ) {
        revenuePhp += Number(b.final_total_php);
      }
      if (checkInKey === monthKey) {
        bookingsCount += 1;
      }

      if (rb.resources) {
        const start = new Date(rb.start_date);
        const end = new Date(rb.end_date);
        const clampedStart = start < firstOfMonth ? firstOfMonth : start;
        const clampedEnd = end > nextMonthStart ? nextMonthStart : end;
        const nights = Math.max(
          0,
          (clampedEnd.getTime() - clampedStart.getTime()) /
            (1000 * 60 * 60 * 24)
        );
        if (nights > 0) {
          const label = rb.resources.label;
          nightsByRoom.set(label, (nightsByRoom.get(label) ?? 0) + nights);
        }
      }
    }

    const occupancyByRoom: Record<string, number> = {};
    for (const label of activeRoomLabels) {
      const nights = nightsByRoom.get(label) ?? 0;
      occupancyByRoom[label] = Math.round((nights / daysInMonth) * 100);
    }

    return {
      monthLabel: firstOfMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      revenuePhp,
      bookingsCount,
      occupancyByRoom,
    };
  });

  return history;
}

export async function getReviewSummary(
  supabase: SupabaseServerClient
): Promise<{ count: number; averageRating: number | null }> {
  const { data } = await supabase
    .from("reviews")
    .select("rating")
    .eq("is_approved", true);

  const ratings = (data ?? []).map((r) => r.rating as number);
  if (ratings.length === 0) return { count: 0, averageRating: null };

  const average =
    ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return { count: ratings.length, averageRating: Math.round(average * 10) / 10 };
}
