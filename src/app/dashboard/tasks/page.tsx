import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskActionButton } from "./task-action-button";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";
import type { Task } from "@/lib/types";

function TaskRow({ task }: { task: Task }) {
  const label =
    task.type === "cleaning" ? task.resource_label : task.driver_window_label;
  const dotColor =
    task.status === "pending"
      ? "bg-[#e03e3e]"
      : task.status === "in_progress"
        ? "bg-[#eab308]"
        : "bg-[#22c55e]";

  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-white px-3 py-2.5">
      <span className={`h-2.5 w-2.5 flex-none rounded-full ${dotColor}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-guest-ink">
          {task.guest_name} · {label ?? "—"}
        </p>
        <p className="text-xs text-guest-muted">{task.task_date}</p>
      </div>
      <TaskActionButton taskId={task.id} status={task.status} />
    </div>
  );
}

export default async function TasksPage() {
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

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, booking_id, type, status, guest_name, task_date, resource_label, driver_window_label, completed_at, completed_by, created_at"
    )
    .order("task_date", { ascending: true });

  const allTasks = (tasks as Task[] | null) ?? [];
  const cleaning = allTasks.filter((t) => t.type === "cleaning");
  const driving = allTasks.filter((t) => t.type === "driver");

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

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[26px] font-normal text-guest-ink">Tasks</h1>
        <div className="flex items-center gap-5 text-[13px]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e03e3e]" />
            Not Done
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#eab308]" />
            Ongoing
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            Done
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          Couldn&apos;t load tasks: {error.message}
        </p>
      )}

      <div className="grid max-w-[720px] grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-4 text-lg font-normal text-guest-ink">
            Cleaning
          </h2>
          <div className="flex flex-col gap-3">
            {cleaning.length === 0 ? (
              <p className="text-sm text-guest-muted">Nothing here.</p>
            ) : (
              cleaning.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-lg font-normal text-guest-ink">
            Driving
          </h2>
          <div className="flex flex-col gap-3">
            {driving.length === 0 ? (
              <p className="text-sm text-guest-muted">Nothing here.</p>
            ) : (
              driving.map((t) => <TaskRow key={t.id} task={t} />)
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
