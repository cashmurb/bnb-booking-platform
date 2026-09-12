import Link from "next/link";
import {
  HomeIcon,
  AppointmentsIcon,
  NotebookIcon,
  TaskIcon,
  BusinessFinanceIcon,
} from "../icons";

export function ManagementSidebar({ role }: { role: string }) {
  const isOwner = role === "owner";

  return (
    <aside className="fixed left-0 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-6 rounded-r-[40px] bg-guest-navy px-4 py-7">
      <Link href="/dashboard" className="text-white" aria-label="Dashboard">
        <HomeIcon className="h-5 w-5" />
      </Link>

      {isOwner && (
        <Link
          href="/dashboard/calendar"
          className="text-white"
          aria-label="Calendar"
        >
          <AppointmentsIcon className="h-5 w-5" />
        </Link>
      )}

      {isOwner && (
        <Link
          href="/dashboard/bookings"
          className="text-white"
          aria-label="Bookings"
        >
          <NotebookIcon className="h-5 w-5" />
        </Link>
      )}

      <Link href="/dashboard/tasks" className="text-white" aria-label="Tasks">
        <TaskIcon className="h-5 w-5" />
      </Link>

      {isOwner && (
        <Link
          href="/dashboard/listings"
          className="text-white"
          aria-label="Listings"
        >
          <BusinessFinanceIcon className="h-5 w-5" />
        </Link>
      )}
    </aside>
  );
}
