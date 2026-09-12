"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "./actions";

export function ProfileMenu({
  name,
  role,
}: {
  name: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isOwner = role.toLowerCase() === "owner";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5"
      >
        <div className="h-9 w-9 rounded-full bg-[#d9d9d9]" />
        <div className="text-left">
          <div className="text-[13px] font-semibold text-guest-ink">
            {name}
          </div>
          <div className="text-[11px] capitalize text-guest-muted">
            {role}
          </div>
        </div>
        <span
          className={`text-guest-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-40 overflow-hidden rounded-lg border border-guest-border bg-white shadow-lg">
          {isOwner && (
            <Link
              href="/dashboard/staff"
              onClick={() => setOpen(false)}
              className="block w-full px-4 py-2.5 text-left text-sm text-guest-ink hover:bg-[#f5f5f5]"
            >
              Manage Staff
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="w-full px-4 py-2.5 text-left text-sm text-guest-ink hover:bg-[#f5f5f5]"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
