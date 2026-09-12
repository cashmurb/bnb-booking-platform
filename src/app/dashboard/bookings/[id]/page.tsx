import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CancelBookingButton } from "../cancel-booking-button";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-[#e6f4ea] text-[#1e7d3c]",
  held: "bg-amber-100 text-amber-800",
  expired: "bg-stone-100 text-stone-500",
  cancelled: "bg-red-100 text-red-700",
};

export default async function BookingDetailPage({
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

  type BookingDetail = {
    id: string;
    status: string;
    guest_name: string;
    guest_contact: string;
    guest_email: string | null;
    payment_method: string | null;
    guest_count: number | null;
    calculated_total_php: number | null;
    final_total_php: number | null;
    resource_bookings: {
      start_date: string;
      end_date: string;
      resources: {
        label: string;
        nightly_rate_php: number;
        base_occupancy: number | null;
        extra_guest_fee_php: number | null;
        cleaning_fee_php: number | null;
      } | null;
    }[];
    driver_slot_bookings: {
      slot_date: string;
      driver_windows: { label: string; price_php: number } | null;
    }[];
  };

  const { data: bookingData } = await supabase
    .from("bookings")
    .select(
      `
      id, status, guest_name, guest_contact, guest_email, payment_method, guest_count,
      calculated_total_php, final_total_php,
      resource_bookings (
        start_date, end_date,
        resources ( label, nightly_rate_php, base_occupancy, extra_guest_fee_php, cleaning_fee_php )
      ),
      driver_slot_bookings ( slot_date, driver_windows ( label, price_php ) )
    `
    )
    .eq("id", id)
    .single();

  const booking = bookingData as unknown as BookingDetail | null;

  if (!booking) {
    notFound();
  }

  const rb = booking.resource_bookings[0];
  const room = rb?.resources;

  const nights = rb
    ? Math.max(
        0,
        Math.round(
          (new Date(rb.end_date).getTime() - new Date(rb.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  const roomSubtotal = room ? Number(room.nightly_rate_php) * nights : 0;
  const extraGuests =
    room?.base_occupancy != null && booking.guest_count != null
      ? Math.max(0, booking.guest_count - room.base_occupancy)
      : 0;
  const extraGuestTotal = extraGuests * (room?.extra_guest_fee_php ?? 0);
  const cleaningFee = room?.cleaning_fee_php ?? 0;
  const driverTotal = booking.driver_slot_bookings.reduce(
    (sum, d) => sum + (d.driver_windows?.price_php ?? 0),
    0
  );

  const overridden =
    booking.calculated_total_php != null &&
    booking.final_total_php != null &&
    Number(booking.calculated_total_php) !== Number(booking.final_total_php);

  return (
    <main className="mx-auto max-w-[760px] px-10 py-6">
      <Link
        href="/dashboard/bookings"
        className="text-xs text-guest-muted"
      >
        ← Back to Bookings Management
      </Link>

      <div className="my-4 flex items-center justify-between">
        <h1 className="text-[26px] font-normal text-guest-ink">
          Booking {booking.id.slice(0, 8).toUpperCase()}
        </h1>
        <span
          className={`rounded-[10px] px-3 py-1.5 text-xs capitalize ${
            STATUS_STYLES[booking.status] ?? "bg-stone-100 text-stone-600"
          }`}
        >
          {booking.status}
        </span>
      </div>

      <div className="mb-5 rounded-[14px] bg-white p-6">
        <h3 className="mb-4 text-base font-normal text-guest-ink">Guest</h3>
        <div className="grid grid-cols-2 gap-3.5 text-[13px]">
          <div>
            <div className="mb-1 text-guest-muted">Name</div>
            <div className="font-semibold">{booking.guest_name}</div>
          </div>
          <div>
            <div className="mb-1 text-guest-muted">Contact</div>
            <div className="font-semibold">{booking.guest_contact}</div>
          </div>
          <div>
            <div className="mb-1 text-guest-muted">Email</div>
            <div className="font-semibold">{booking.guest_email ?? "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-guest-muted">Guests</div>
            <div className="font-semibold">{booking.guest_count ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="mb-5 rounded-[14px] bg-white p-6">
        <h3 className="mb-4 text-base font-normal text-guest-ink">Stay</h3>
        <div className="grid grid-cols-2 gap-3.5 text-[13px]">
          <div>
            <div className="mb-1 text-guest-muted">Property</div>
            <div className="font-semibold">{room?.label ?? "—"}</div>
          </div>
          <div>
            <div className="mb-1 text-guest-muted">Dates</div>
            <div className="font-semibold">
              {rb ? `${rb.start_date} → ${rb.end_date}` : "—"}
            </div>
          </div>
          {booking.driver_slot_bookings.map((d, i) => (
            <div key={i}>
              <div className="mb-1 text-guest-muted">
                {d.driver_windows?.label ?? "Driver slot"}
              </div>
              <div className="font-semibold">{d.slot_date}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-7 rounded-[14px] bg-white p-6">
        <h3 className="mb-4 text-base font-normal text-guest-ink">
          Payment
        </h3>
        <div className="flex flex-col gap-2 text-[13px]">
          {room && (
            <div className="flex justify-between">
              <span className="text-guest-muted">
                ₱{room.nightly_rate_php} × {nights} night
                {nights === 1 ? "" : "s"}
              </span>
              <span>₱{roomSubtotal.toFixed(2)}</span>
            </div>
          )}
          {extraGuests > 0 && (
            <div className="flex justify-between">
              <span className="text-guest-muted">
                Extra guests ({extraGuests} × ₱{room?.extra_guest_fee_php})
              </span>
              <span>₱{extraGuestTotal.toFixed(2)}</span>
            </div>
          )}
          {room && (
            <div className="flex justify-between">
              <span className="text-guest-muted">Cleaning fee</span>
              <span>₱{cleaningFee.toFixed(2)}</span>
            </div>
          )}
          {driverTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-guest-muted">Driver slot(s)</span>
              <span>₱{driverTotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-[#ececec] pt-2 font-semibold">
            <span>Total</span>
            <span>
              ₱
              {booking.final_total_php != null
                ? Number(booking.final_total_php).toFixed(2)
                : "0.00"}
            </span>
          </div>
          {overridden && (
            <p className="text-guest-muted">
              Calculated total was ₱
              {Number(booking.calculated_total_php).toFixed(2)} — manually
              overridden.
            </p>
          )}
          {booking.payment_method && (
            <div className="flex justify-between border-t border-[#ececec] pt-2">
              <span className="text-guest-muted">Stated preference</span>
              <span>
                {
                  {
                    card: "Credit/Debit Card",
                    gcash: "GCash",
                    bank_transfer: "Bank Transfer",
                  }[booking.payment_method] ?? booking.payment_method
                }
              </span>
            </div>
          )}
          <p className="mt-1 text-guest-muted">
            No online payment taken yet — this reflects a reservation, not
            a completed charge.
          </p>
        </div>
      </div>

      {(booking.status === "held" || booking.status === "confirmed") && (
        <CancelBookingButton
          bookingId={booking.id}
          guestName={booking.guest_name}
        />
      )}
    </main>
  );
}
