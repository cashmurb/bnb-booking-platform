import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export const ROOM_COLORS: Record<string, string> = {
  "2-Bedroom Unit": "bg-[#dbe4ff] text-[#2c3e8c]",
  "Studio Unit A": "bg-[#dcf5e4] text-[#1e7d3c]",
  "Studio Unit B": "bg-[#fde8cc] text-[#a15c00]",
};
export const FALLBACK_COLOR = "bg-guest-band text-guest-ink";

export function parseMonthParam(
  month: string | undefined
): { year: number; monthIndex: number } {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, monthIndex: m - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export function monthParamString(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function toDateString(
  year: number,
  monthIndex: number,
  day: number
): string {
  let m = monthIndex;
  if (m < 0) m = 11;
  return `${year}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export type DayBooking = { label: string };
export type CalendarCell = { day: number | null; date: string | null };

export type CalendarData = {
  cells: CalendarCell[];
  byDate: Map<string, DayBooking[]>;
  monthLabel: string;
  daysInMonth: number;
};

export async function getCalendarData(
  supabase: SupabaseServerClient,
  year: number,
  monthIndex: number
): Promise<CalendarData> {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id,
      resource_bookings ( start_date, end_date, resources ( label ) )
    `
    )
    .eq("status", "confirmed");

  const byDate = new Map<string, DayBooking[]>();

  for (const b of bookings ?? []) {
    for (const rb of b.resource_bookings as unknown as {
      start_date: string;
      end_date: string;
      resources: { label: string } | null;
    }[]) {
      if (!rb.resources) continue;
      const start = new Date(rb.start_date);
      const end = new Date(rb.end_date);
      for (
        let d = new Date(Math.max(start.getTime(), firstOfMonth.getTime()));
        d < end && d.getMonth() === monthIndex && d.getFullYear() === year;
        d.setDate(d.getDate() + 1)
      ) {
        const key = toDateString(d.getFullYear(), d.getMonth(), d.getDate());
        const list = byDate.get(key) ?? [];
        list.push({ label: rb.resources.label });
        byDate.set(key, list);
      }
    }
  }

  const cells: CalendarCell[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, date: toDateString(year, monthIndex, d) });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });

  const monthLabel = firstOfMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return { cells, byDate, monthLabel, daysInMonth };
}
