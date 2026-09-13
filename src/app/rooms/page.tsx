import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { ROOM_COVER_PHOTOS } from "@/lib/room-photos";
import { getRooms } from "../guest-actions";
import { GuestFooter } from "../guest-footer";
import { ChatWidget } from "../chat-widget";

export default async function RoomsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const rooms = await getRooms();

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <header className="px-6 pt-10 pb-8 text-center">
          <Link href="/" className="text-guest-ink">
            <h1 className="text-[26px] font-bold">WnJ Comfy Homes</h1>
          </Link>
        </header>

        {rooms.length === 0 ? (
          <p className="mx-auto max-w-[900px] px-6 text-sm text-guest-muted">
            No rooms are available to book online right now. Please reach out to us directly.
          </p>
        ) : (
          <div className="mx-auto mb-16 grid max-w-[900px] grid-cols-1 gap-x-10 gap-y-8 px-6 sm:grid-cols-2">
            {rooms.map((room) => {
              const coverPhoto = ROOM_COVER_PHOTOS[room.label];
              return (
                <Link
                  key={room.id}
                  href={`/rooms/${slugify(room.label)}`}
                  className="guest-btn text-guest-ink"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-none border border-guest-border bg-guest-band">
                    {coverPhoto && (
                      <Image
                        src={coverPhoto}
                        alt={room.label}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 450px"
                      />
                    )}
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold">
                      {room.label}
                    </span>
                    <span className="text-[11px] text-guest-muted">
                      ₱{room.nightly_rate_php}/night
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <GuestFooter maxWidthClassName="max-w-[900px]" />
      <ChatWidget />
    </div>
  );
}
