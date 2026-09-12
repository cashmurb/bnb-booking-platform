import { getCalendarData } from "./calendar-data";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const DOT_COLORS: Record<string, string> = {
  "2-Bedroom Unit": "#5b6bb8",
  "Studio Unit A": "#1e7d3c",
  "Studio Unit B": "#a15c00",
};
const DOT_FALLBACK = "#8a8a8a";

export async function MiniCalendar({
  supabase,
}: {
  supabase: SupabaseServerClient;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const monthIndex = now.getMonth();

  const { cells, byDate, monthLabel } = await getCalendarData(
    supabase,
    year,
    monthIndex
  );

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-guest-ink">
        {monthLabel}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-guest-muted">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const roomsToday = cell.date ? (byDate.get(cell.date) ?? []) : [];
          return (
            <div
              key={i}
              className="flex aspect-square flex-col items-center justify-center rounded text-[10px] text-guest-ink"
            >
              {cell.day && (
                <>
                  <span>{cell.day}</span>
                  {roomsToday.length > 0 && (
                    <span className="mt-0.5 flex gap-[2px]">
                      {roomsToday.slice(0, 3).map((r, idx) => (
                        <span
                          key={idx}
                          className="h-1 w-1 rounded-full"
                          style={{
                            backgroundColor:
                              DOT_COLORS[r.label] ?? DOT_FALLBACK,
                          }}
                        />
                      ))}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
