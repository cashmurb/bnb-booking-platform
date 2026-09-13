"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { logout } from "./actions";
import { uploadAvatar } from "./avatar-actions";

export function ProfileMenu({
  name,
  role,
  avatarUrl,
}: {
  name: string;
  role: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [changingPhoto, setChangingPhoto] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwner = role.toLowerCase() === "owner";

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setChangingPhoto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleUpload(formData: FormData) {
    setUploadError(null);
    startTransition(async () => {
      const result = await uploadAvatar(formData);
      if (result.error) {
        setUploadError(result.error);
      } else {
        setChangingPhoto(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    });
  }

  const avatar = avatarUrl ? (
    <Image
      src={avatarUrl}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 flex-none rounded-full object-cover"
    />
  ) : (
    <div className="h-9 w-9 flex-none rounded-full bg-[#d9d9d9]" />
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5"
      >
        {avatar}
        <div className="hidden text-left lg:block">
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
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 overflow-hidden rounded-lg border border-guest-border bg-white shadow-lg">
          {changingPhoto ? (
            <div className="border-b border-guest-border p-3">
              <form action={handleUpload} className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  className="text-xs text-guest-muted file:mr-2 file:rounded-md file:border file:border-guest-border file:bg-white file:px-2 file:py-1 file:text-xs file:text-guest-ink"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="guest-btn flex-1 rounded-md bg-guest-navy px-3 py-1.5 text-xs font-medium text-white hover:bg-guest-navy-dark disabled:opacity-50"
                  >
                    {isPending ? "Uploading…" : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChangingPhoto(false)}
                    disabled={isPending}
                    className="rounded-md border border-guest-border px-3 py-1.5 text-xs text-guest-ink hover:bg-guest-band"
                  >
                    Cancel
                  </button>
                </div>
                {uploadError && (
                  <p className="text-[11px] text-red-600">{uploadError}</p>
                )}
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setChangingPhoto(true)}
              className="block w-full px-4 py-2.5 text-left text-sm text-guest-ink hover:bg-[#f5f5f5]"
            >
              Change Photo
            </button>
          )}
          {isOwner && (
            <>
              <Link
                href="/dashboard/records"
                onClick={() => setOpen(false)}
                className="block w-full px-4 py-2.5 text-left text-sm text-guest-ink hover:bg-[#f5f5f5] lg:hidden"
              >
                Records
              </Link>
              <Link
                href="/dashboard/reports"
                onClick={() => setOpen(false)}
                className="block w-full px-4 py-2.5 text-left text-sm text-guest-ink hover:bg-[#f5f5f5] lg:hidden"
              >
                Reports
              </Link>
              <Link
                href="/dashboard/staff"
                onClick={() => setOpen(false)}
                className="block w-full px-4 py-2.5 text-left text-sm text-guest-ink hover:bg-[#f5f5f5]"
              >
                Manage Staff
              </Link>
            </>
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
