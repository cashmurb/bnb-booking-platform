import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ListingForm } from "./listing-form";
import { PhotoCarousel } from "./photo-carousel";

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

  const { data: photoRows } = await supabase
    .from("resource_photos")
    .select("id, storage_path")
    .eq("resource_id", id)
    .order("display_order", { ascending: true });

  const photos = (photoRows ?? []).map((row) => ({
    src: supabase.storage.from("room-photos").getPublicUrl(row.storage_path)
      .data.publicUrl,
    deletable: true as const,
    photoId: row.id,
    storagePath: row.storage_path,
  }));

  return (
    <main className="mx-auto max-w-[720px] px-10 py-6">
      <Link href="/dashboard/listings" className="text-xs text-guest-muted">
        ← Back to Listings
      </Link>

      <h1 className="my-4 text-[26px] font-normal text-guest-ink">
        Edit Listing
      </h1>

      <PhotoCarousel
        resourceId={id}
        resourceLabel={resource.label}
        initialPhotos={photos}
      />

      <ListingForm resource={resource} />
    </main>
  );
}
