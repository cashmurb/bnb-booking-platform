import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SearchBar } from "./search-bar";
import { ProfileMenu } from "./profile-menu";
import { ApproveReviewButton } from "./approve-review-button";
import { MiniCalendar } from "./mini-calendar";
import type { Task } from "@/lib/types";

export default async function DashboardPage() {
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

  const isOwner = profile?.role === "owner";

  type DashboardMetrics = {
    active_bookings: number;
    upcoming_checkins: number;
    pending_tasks: number;
    occupancy_rate_percent: number;
  };

  const [{ data: metrics }, { data: previewTasks }, { data: pendingReviews }] =
    await Promise.all([
      supabase.rpc("get_dashboard_metrics").single() as unknown as Promise<{
        data: DashboardMetrics | null;
      }>,
      supabase
        .from("tasks")
        .select(
          "id, type, status, guest_name, task_date, resource_label, driver_window_label"
        )
        .in("status", ["pending", "in_progress"])
        .order("task_date", { ascending: true })
        .limit(5),
      isOwner
        ? supabase
            .from("reviews")
            .select("id, guest_name, rating, comment")
            .eq("is_approved", false)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: null }),
    ]);

  const tasks = (previewTasks as Task[] | null) ?? [];

  type PendingReview = {
    id: string;
    guest_name: string;
    rating: number;
    comment: string;
  };
  const reviews = (pendingReviews as PendingReview[] | null) ?? [];

  return (
    <main className="px-10 py-6">
      <div className="mb-7 flex items-center gap-4">
        <SearchBar />
        <div className="ml-auto flex items-center gap-5 text-[13px]">
          {isOwner && (
            <div className="hidden items-center gap-5 lg:flex">
              <Link href="/dashboard/records" className="text-[#4a4a4a]">
                Records
              </Link>
              <Link href="/dashboard/reports" className="text-[#4a4a4a]">
                Reports
              </Link>
              <div className="h-5 w-px bg-[#ececec]" />
            </div>
          )}
          <ProfileMenu
            name={profile?.full_name ?? user.email ?? "Account"}
            avatarUrl={
              profile?.avatar_path
                ? supabase.storage
                    .from("avatars")
                    .getPublicUrl(profile.avatar_path).data.publicUrl
                : null
            }
            role={profile?.role ?? "unknown"}
          />
        </div>
      </div>

      <div
        className={`mb-5 grid grid-cols-1 gap-5 ${isOwner ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
      >
        <div className="min-h-[100px] rounded-[10px] border border-white/60 bg-white/60 p-5 shadow-sm backdrop-blur-md lg:min-h-[140px] lg:border-none lg:bg-[#f5f5f5] lg:shadow-none lg:backdrop-blur-none">
          <h3 className="mb-2 text-[18px] font-normal text-guest-ink">
            Active Bookings
          </h3>
          <p className="text-3xl font-semibold text-guest-navy">
            {metrics?.active_bookings ?? 0}
          </p>
        </div>
        <div className="min-h-[100px] rounded-[10px] border border-white/60 bg-white/60 p-5 shadow-sm backdrop-blur-md lg:min-h-[140px] lg:border-none lg:bg-[#f5f5f5] lg:shadow-none lg:backdrop-blur-none">
          <h3 className="mb-2 text-[18px] font-normal text-guest-ink">
            Upcoming Check-ins
          </h3>
          <p className="text-3xl font-semibold text-guest-navy">
            {metrics?.upcoming_checkins ?? 0}
          </p>
          <p className="mt-1 text-xs text-guest-muted">Next 7 days</p>
        </div>
        {isOwner && (
          <div className="min-h-[100px] rounded-[10px] border border-white/60 bg-white/60 p-5 shadow-sm backdrop-blur-md lg:min-h-[140px] lg:border-none lg:bg-[#f5f5f5] lg:shadow-none lg:backdrop-blur-none">
            <h3 className="mb-2 text-[18px] font-normal text-guest-ink">
              Monthly Occupancy Rate
            </h3>
            <p className="text-3xl font-semibold text-guest-navy">
              {metrics?.occupancy_rate_percent ?? 0}%
            </p>
            <p className="mt-1 text-xs text-guest-muted">
              Across all active rooms, this month
            </p>
          </div>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-5 ${isOwner ? "lg:grid-cols-2" : ""}`}
      >
        {isOwner && (
          <div className="flex min-h-[420px] flex-col rounded-[10px] bg-[#f5f5f5] p-5">
            <h3 className="mb-3 text-[18px] font-normal text-guest-ink">
              Calendar
            </h3>
            <MiniCalendar supabase={supabase} />
            <Link
              href="/dashboard/calendar"
              className="mt-auto inline-block w-fit pt-4 text-sm font-semibold text-guest-navy"
            >
              Go to full Calendar →
            </Link>
          </div>
        )}

        <div className="flex min-h-[420px] flex-col rounded-[10px] bg-[#f5f5f5] p-5">
          <h3 className="mb-3 text-[18px] font-normal text-guest-ink">
            Tasks
          </h3>
          {tasks.length === 0 ? (
            <p className="text-sm text-guest-muted">
              Nothing pending right now.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-md bg-white px-3 py-2.5 text-[13px]"
                >
                  <p className="font-semibold text-guest-ink">
                    {t.guest_name} ·{" "}
                    {t.type === "cleaning"
                      ? t.resource_label
                      : t.driver_window_label}
                  </p>
                  <p className="text-xs text-guest-muted">{t.task_date}</p>
                </div>
              ))}
            </div>
          )}
          <Link
            href="/dashboard/tasks"
            className="mt-auto inline-block w-fit pt-4 text-sm font-semibold text-guest-navy"
          >
            View all tasks →
          </Link>
        </div>
      </div>

      {isOwner && reviews.length > 0 && (
        <div className="mt-5 rounded-[10px] border border-white/60 bg-white/60 p-5 shadow-sm backdrop-blur-md lg:border-none lg:bg-[#f5f5f5] lg:shadow-none lg:backdrop-blur-none">
          <h3 className="mb-3 text-[18px] font-normal text-guest-ink">
            Pending Reviews
          </h3>
          <div className="flex flex-col gap-2">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-guest-ink">
                    {r.guest_name} · {"★".repeat(r.rating)}
                    {"☆".repeat(5 - r.rating)}
                  </p>
                  <p className="truncate text-xs text-guest-muted">
                    {r.comment}
                  </p>
                </div>
                <ApproveReviewButton reviewId={r.id} />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
