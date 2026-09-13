"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HomeIcon,
  AppointmentsIcon,
  NotebookIcon,
  TaskIcon,
  BusinessFinanceIcon,
  PinIcon,
} from "../icons";

export function ManagementSidebar({ role }: { role: string }) {
  const isOwner = role === "owner";
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const isExpanded = isHovered || isPinned;

  const links = [
    { href: "/dashboard", label: "Home", icon: HomeIcon, show: true },
    {
      href: "/dashboard/calendar",
      label: "Calendar",
      icon: AppointmentsIcon,
      show: isOwner,
    },
    {
      href: "/dashboard/bookings",
      label: "Bookings",
      icon: NotebookIcon,
      show: isOwner,
    },
    { href: "/dashboard/tasks", label: "Tasks", icon: TaskIcon, show: true },
    {
      href: "/dashboard/listings",
      label: "Listings",
      icon: BusinessFinanceIcon,
      show: isOwner,
    },
  ].filter((link) => link.show);

  return (
    <>
      {/* Desktop: hover-to-reveal, with a separate pin to keep it open */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed left-0 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-center gap-6 rounded-r-[40px] bg-guest-navy px-4 py-7 transition-transform duration-200 ease-out lg:flex ${
          isExpanded
            ? "translate-x-0"
            : "-translate-x-[calc(100%-14px)]"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsPinned((v) => !v)}
          aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar open"}
          aria-pressed={isPinned}
          className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            isPinned
              ? "bg-white text-guest-navy"
              : "text-white/60 hover:text-white"
          }`}
        >
          <PinIcon className="h-4 w-4" />
        </button>

        {links.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="text-white" aria-label={label}>
            <Icon className="h-5 w-5" />
          </Link>
        ))}
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-10 flex items-center justify-around bg-guest-navy px-2 py-2.5 lg:hidden">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-2 text-white"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

