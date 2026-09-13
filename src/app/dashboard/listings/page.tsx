import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROOM_COVER_PHOTOS } from "@/lib/room-photos";
import { SearchBar } from "../search-bar";
import { ProfileMenu } from "../profile-menu";

export default async function ListingsPage() {
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

  if (profile?.role !== "owner") {
    redirect("/dashboard");
  }

  const { data: rooms } = await supabase
    .from("resources")
    .select("id, label, is_active, nightly_rate_php")
    .in("type", ["room_2br", "room_studio"])
    .order("label");

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
            avatarUrl={
              profile?.avatar_path
                ? supabase.storage
                    .from("avatars")
                    .getPublicUrl(profile.avatar_path).data.publicUrl
                : null
            }
            role="Owner"
          />
        </div>
      </div>

      <h1 className="mb-5 text-[26px] font-normal text-guest-ink">
        Listings
      </h1>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        {(rooms ?? []).map((r) => {
          const coverPhoto = ROOM_COVER_PHOTOS[r.label];
          return (
            <div
              key={r.id}
              className="flex flex-col gap-2 rounded-[14px] bg-white p-3.5"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-[10px] bg-guest-band">
                {coverPhoto ? (
                  <Image
                    src={coverPhoto}
                    alt={r.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-guest-muted">
                    Photo
                  </div>
                )}
              </div>
              <div className="text-base text-guest-ink">{r.label}</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-guest-ink">
                  {r.nightly_rate_php != null
                    ? `₱${r.nightly_rate_php}/night`
                    : "No price set"}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    r.is_active
                      ? "bg-[#e6f4ea] text-[#1e7d3c]"
                      : "bg-[#f0f0f2] text-[#8a8a8a]"
                  }`}
                >
                  {r.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <Link
                href={`/dashboard/listings/${r.id}`}
                className="mt-1.5 rounded-md border border-guest-border bg-guest-band py-2 text-center text-sm text-guest-ink hover:bg-[#eeeeee]"
              >
                Edit listing
              </Link>
            </div>
          );
        })}
      </div>
    </main>
  );
}

