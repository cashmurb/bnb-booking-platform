import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { getRooms } from "../../guest-actions";
import { RoomBooking } from "./room-booking";

export default async function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { slug } = await params;
  const rooms = await getRooms();
  const room = rooms.find((r) => slugify(r.label) === slug);

  if (!room) {
    notFound();
  }

  const { data: photoRows } = await supabase
    .from("resource_photos")
    .select("storage_path")
    .eq("resource_id", room.id)
    .order("display_order", { ascending: true });

  const photos = (photoRows ?? []).map(
    (row) =>
      supabase.storage.from("room-photos").getPublicUrl(row.storage_path)
        .data.publicUrl
  );

  return <RoomBooking room={room} photos={photos} />;
}
