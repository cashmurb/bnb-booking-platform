"use client";

import { usePathname } from "next/navigation";

export function PreviewModeBanner({
  isPreviewMode,
}: {
  isPreviewMode: boolean;
}) {
  const pathname = usePathname();

  if (!isPreviewMode || pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-guest-navy px-4 py-2 text-xs text-white">
      <span>Previewing your guest site as the Owner.</span>
      <a href="/exit-preview" className="underline hover:text-white/80">
        Exit Preview → Dashboard
      </a>
    </div>
  );
}
