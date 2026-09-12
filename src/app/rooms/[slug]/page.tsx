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

  return <RoomBooking room={room} />;
}