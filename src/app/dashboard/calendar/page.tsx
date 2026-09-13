import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";
import {
  ROOM_COLORS,
  FALLBACK_COLOR,
  DOT_COLORS,
  DOT_FALLBACK,
  parseMonthParam,
  monthParamString,
  getCalendarData,
} from "../calendar-data";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
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

  const { month } = await searchParams;
  const { year, monthIndex } = parseMonthParam(month);

  const prevMonthIndex = monthIndex === 0 ? 11 : monthIndex - 1;
  const prevYear = monthIndex === 0 ? year - 1 : year;
  const nextMonthIndex = monthIndex === 11 ? 0 : monthIndex + 1;
  const nextYear = monthIndex === 11 ? year + 1 : year;

  const { cells, byDate, monthLabel } = await getCalendarData(
    supabase,
    year,
    monthIndex
  );

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar />
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
            role="Owner"
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[26px] font-normal text-guest-ink">
          Master Calendar
        </h1>
        <div className="flex items-center gap-3.5 text-sm">
          <Link
            href={`/dashboard/calendar?month=${monthParamString(prevYear, prevMonthIndex)}`}
            className="text-guest-muted hover:text-guest-ink"
            aria-label="Previous month"
          >
            ‹
          </Link>
          <span className="font-semibold text-guest-ink">{monthLabel}</span>
          <Link
            href={`/dashboard/calendar?month=${monthParamString(nextYear, nextMonthIndex)}`}
            className="text-guest-muted hover:text-guest-ink"
            aria-label="Next month"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 text-xs">
        {Object.entries(ROOM_COLORS).map(([label, cls]) => (
          <span
            key={label}
            className={`rounded px-2 py-1 ${cls.split(" ")[0]} ${cls.split(" ")[1]}`}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] bg-white">
        <div className="grid grid-cols-7">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div
              key={d}
              className="border-b border-[#ececec] py-3 text-center text-xs text-guest-muted"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const bookingsToday = cell.date ? (byDate.get(cell.date) ?? []) : [];
            return (
              <div
                key={i}
                className="min-h-[56px] border-b border-r border-[#ececec] p-2 lg:min-h-[96px]"
              >
                {cell.day && (
                  <>
                    <span className="text-xs text-guest-ink">{cell.day}</span>

                    {/* Desktop: full room-name chips, unchanged */}
                    <div className="mt-1 hidden flex-col gap-1 lg:flex">
                      {bookingsToday.slice(0, 3).map((b, idx) => (
                        <span
                          key={idx}
                          className={`truncate rounded px-1.5 py-0.5 text-[10px] ${
                            ROOM_COLORS[b.label] ?? FALLBACK_COLOR
                          }`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                    
                    {bookingsToday.length > 0 && (
                      <div className="mt-1 flex gap-0.5 lg:hidden">
                        {bookingsToday.slice(0, 3).map((b, idx) => (
                          <span
                            key={idx}
                            className="h-1.5 w-1.5 flex-none rounded-full"
                            style={{
                              backgroundColor:
                                DOT_COLORS[b.label] ?? DOT_FALLBACK,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
