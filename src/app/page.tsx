import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slugify";
import { getRooms } from "./guest-actions";
import { GuestFooter } from "./guest-footer";
import { ChatWidget } from "./chat-widget";
import { Slideshow } from "./slideshow";

function roomPhotoPaths(folder: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    `/images/rooms/${folder}/${String(i + 1).padStart(2, "0")}.jpg`
  );
}

const ROOM_PHOTO_PATHS: Record<string, string[]> = {
  "2-Bedroom Unit": roomPhotoPaths("2-bedroom", 15),
  "Studio Unit A": roomPhotoPaths("studio-a", 18),
  "Studio Unit B": roomPhotoPaths("studio-b", 8),
};

const HERO_PHOTOS = [
  "/images/rooms/2-bedroom/01.jpg",
  "/images/rooms/studio-a/01.jpg",
  "/images/rooms/studio-b/01.jpg",
  "/images/rooms/2-bedroom/14.jpg",
];

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const rooms = await getRooms();

  const { data: reviews } = await supabase
    .from("reviews")
    .select("guest_name, rating, comment")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(3);

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 border-t border-guest-ink">
        <header className="mx-auto max-w-[900px] px-6 pt-16 pb-10 text-center">
          <h1 className="mb-4 text-[38px] font-bold tracking-wide text-guest-ink">
            WnJ Comfy Homes
          </h1>
          <p className="mx-auto mb-7 max-w-[520px] text-[15px] leading-relaxed text-guest-muted">
            We are providing services that will make your stay in Cebu
            comfortable, convenient and safe. Feel at home with us.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/rooms"
              className="guest-btn inline-block rounded-md bg-guest-navy px-[22px] py-2.5 text-[13px] text-white"
            >
              Find a room
            </Link>
            <a
              href="https://m.me/wnjservices"
              target="_blank"
              rel="noopener noreferrer"
              className="guest-btn inline-block rounded-md border border-guest-navy px-[22px] py-2.5 text-[13px] text-guest-navy"
            >
              Contact us
            </a>
          </div>
        </header>

        <div className="mx-auto mb-20 max-w-[1104px] px-6">
          <div className="h-[420px] w-full overflow-hidden rounded-md border border-guest-border bg-guest-band">
            <Slideshow images={HERO_PHOTOS} alt="WnJ Comfy Homes" priority />
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="mx-auto max-w-[1104px] px-6">
            {rooms.map((room, i) => {
              const photos = ROOM_PHOTO_PATHS[room.label] ?? [];
              const image = (
                <div className="h-[280px] w-full overflow-hidden rounded-md border border-guest-border bg-guest-band">
                  <Slideshow images={photos} alt={room.label} />
                </div>
              );
              return (
                <section
                  key={room.id}
                  className={`mb-16 grid grid-cols-1 items-center gap-10 sm:grid-cols-2 ${
                    i === rooms.length - 1 ? "mb-20" : ""
                  }`}
                >
                  {i % 2 === 1 ? (
                    <>
                      {image}
                      <RoomBlurb room={room} />
                    </>
                  ) : (
                    <>
                      <RoomBlurb room={room} />
                      {image}
                    </>
                  )}
                </section>
              );
            })}
          </div>
        )}

        <section className="bg-guest-band px-6 py-14">
          <div className="mx-auto max-w-[1104px]">
            {reviews && reviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
                {reviews.map((r, i) => (
                  <Review key={i} name={r.guest_name} rating={r.rating}>
                    {r.comment}
                  </Review>
                ))}
              </div>
            ) : (
              <p className="text-center text-[13px] text-guest-muted">
                No reviews yet — be the first to share how your stay went.
              </p>
            )}
            <p className="mt-8 text-center text-[12px] text-guest-muted">
              Stayed with us?{" "}
              <Link href="/leave-a-review" className="underline">
                Leave a review
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <GuestFooter />
      <ChatWidget />
    </div>
  );
}

function RoomBlurb({
  room,
}: {
  room: { id: string; label: string; base_occupancy: number | null };
}) {
  return (
    <div>
      <h2 className="mb-2.5 text-[22px] font-normal text-guest-ink">
        {room.label}
      </h2>
      <p className="mb-4 text-[13px] leading-relaxed text-guest-muted">
        {room.base_occupancy != null
          ? `Sleeps ${room.base_occupancy} — fully furnished, wifi included, a comfortable stay on Mactan Island.`
          : "Fully furnished, wifi included, a comfortable stay on Mactan Island."}
      </p>
      <Link
        href={`/rooms/${slugify(room.label)}`}
        className="guest-btn inline-block rounded-md bg-guest-navy px-[18px] py-2.5 text-[12px] text-white"
      >
        Check Availability
      </Link>
    </div>
  );
}

function Review({
  name,
  rating,
  children,
}: {
  name: string;
  rating: number;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1 text-[16px] font-normal text-guest-ink">{name}</h3>
      <p className="mb-2 text-guest-navy" aria-label={`${rating} out of 5 stars`}>
        {"★".repeat(rating)}
        {"☆".repeat(5 - rating)}
      </p>
      <p className="text-[12px] leading-relaxed text-guest-muted">
        {children}
      </p>
    </div>
  );
}
