import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form";
import type { Resource, DriverWindow } from "@/lib/types";

export default async function NewBookingPage() {
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

  const [{ data: resources }, { data: driverWindows }] = await Promise.all([
    supabase
      .from("resources")
      .select(
        "id, type, label, is_active, nightly_rate_php, base_occupancy, max_occupancy, extra_guest_fee_php, cleaning_fee_php"
      )
      .eq("is_active", true)
      .order("type"),
    supabase
      .from("driver_windows")
      .select("id, label, start_time, end_time, price_php, sort_order, spans_midnight")
      .order("sort_order"),
  ]);

  return (
    <main className="px-10 py-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/dashboard/bookings"
            className="text-sm text-guest-muted hover:text-guest-ink"
          >
            ← Back to bookings
          </Link>
          <h1 className="mt-2 text-xl font-normal text-guest-ink">
            New manual booking
          </h1>
          <p className="mt-1 text-sm text-guest-muted">
            This is for guests who booked via Facebook or phone which reserves the same rooms, vehicles, and driver slots the website will use, so
            nothing can be double-booked between channels.
          </p>
        </div>

        <div className="rounded-[14px] bg-white p-6">
          <BookingForm
            resources={(resources as Resource[]) ?? []}
            driverWindows={(driverWindows as DriverWindow[]) ?? []}
          />
        </div>
      </div>
    </main>
  );
}
