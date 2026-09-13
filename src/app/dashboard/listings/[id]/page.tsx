import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROOM_PHOTOS } from "@/lib/room-photos";
import { ListingForm } from "./listing-form";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
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
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    redirect("/dashboard");
  }

  const { id } = await params;

  const { data: resource } = await supabase
    .from("resources")
    .select(
      "id, label, is_active, nightly_rate_php, base_occupancy, max_occupancy, extra_guest_fee_php, cleaning_fee_php, overview, amenities"
    )
    .eq("id", id)
    .single();

  if (!resource) {
    notFound();
  }

  const photos = ROOM_PHOTOS[resource.label];

  return (
    <main className="mx-auto max-w-[720px] px-10 py-6">
      <Link href="/dashboard/listings" className="text-xs text-guest-muted">
        ← Back to Listings
      </Link>

      <h1 className="my-4 text-[26px] font-normal text-guest-ink">
        Edit Listing
      </h1>

      <div className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-guest-ink">Photos</h2>
        {photos ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: photos.count }).map((_, i) => (
              <div
                key={i}
                className="relative aspect-square overflow-hidden rounded-md bg-guest-band"
              >
                <Image
                  src={`/images/rooms/${photos.folder}/${String(i + 1).padStart(2, "0")}.jpg`}
                  alt={`${resource.label} photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="120px"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-guest-muted">
            No photos uploaded for this room yet.
          </p>
        )}
        <p className="mt-2 text-xs text-guest-muted">
          Reference only — there&apos;s no upload tool here yet. These are the same photos guests see on this room&apos;s page.
        </p>
      </div>

      <ListingForm resource={resource} />
    </main>
  );
}
