"use client";

import { useActionState, useEffect, useState } from "react";
import { createManualBooking, type CreateBookingState } from "./actions";
import type {
  Resource,
  DriverWindow,
  ResourceClaimInput,
  DriverClaimInput,
} from "@/lib/types";

const initialState: CreateBookingState = { error: null };

function isRoomType(type: string | undefined) {
  return type?.startsWith("room_") ?? false;
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function BookingForm({
  resources,
  driverWindows,
}: {
  resources: Resource[];
  driverWindows: DriverWindow[];
}) {
  const [state, formAction, pending] = useActionState(
    createManualBooking,
    initialState
  );

  const [resourceClaims, setResourceClaims] = useState<ResourceClaimInput[]>(
    []
  );
  const [driverClaims, setDriverClaims] = useState<DriverClaimInput[]>([]);
  const [guestCount, setGuestCount] = useState<string>("");
  const [overrideTotal, setOverrideTotal] = useState<string>("");
  const [today, setToday] = useState<string>("");

  useEffect(() => {
    const id = setTimeout(() => setToday(todayDateString()), 0);
    return () => clearTimeout(id);
  }, []);

  const resourceTypeById = new Map(resources.map((r) => [r.id, r.type]));
  const roomOptions = resources.filter((r) => isRoomType(r.type));
  const vehicleOptions = resources.filter((r) => !isRoomType(r.type));

  const roomClaimIndex = resourceClaims.findIndex((c) =>
    isRoomType(resourceTypeById.get(c.resource_id))
  );
  const roomClaim = roomClaimIndex >= 0 ? resourceClaims[roomClaimIndex] : null;
  const roomResource = roomClaim
    ? resources.find((r) => r.id === roomClaim.resource_id) ?? null
    : null;

  const vehicleRows = resourceClaims
    .map((claim, index) => ({ claim, index }))
    .filter(({ claim }) => !isRoomType(resourceTypeById.get(claim.resource_id)));

  function nightsBetween(start: string, end: string): number {
    if (!start || !end) return 0;
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
  }

  const nights = roomClaim
    ? nightsBetween(roomClaim.start_date, roomClaim.end_date)
    : 0;
  const guestCountNum = guestCount ? Number(guestCount) : 0;
  const extraGuests =
    roomResource?.base_occupancy != null
      ? Math.max(0, guestCountNum - roomResource.base_occupancy)
      : 0;
  const roomSubtotal = (roomResource?.nightly_rate_php ?? 0) * nights;
  const extraGuestTotal = extraGuests * (roomResource?.extra_guest_fee_php ?? 0);
  const cleaningFee = roomClaim ? roomResource?.cleaning_fee_php ?? 0 : 0;
  const driverTotal = driverClaims.reduce((sum, claim) => {
    const w = driverWindows.find((w) => w.id === claim.window_id);
    return sum + (w?.price_php ?? 0);
  }, 0);
  const calculatedTotal =
    roomSubtotal + extraGuestTotal + cleaningFee + driverTotal;

  const resourceClaimsForSubmission = resourceClaims.map((c) =>
    isRoomType(resourceTypeById.get(c.resource_id))
      ? c
      : {
          ...c,
          start_date: roomClaim?.start_date ?? "",
          end_date: roomClaim?.end_date ?? "",
        }
  );

  function setRoom(resourceId: string) {
    if (!resourceId) {
      setResourceClaims([]);
      setGuestCount("");
      return;
    }
    setResourceClaims((prev) => {
      const existingRoom = prev.find((c) =>
        isRoomType(resourceTypeById.get(c.resource_id))
      );
      const withoutRoom = prev.filter(
        (c) => !isRoomType(resourceTypeById.get(c.resource_id))
      );
      return [
        {
          resource_id: resourceId,
          start_date: existingRoom?.start_date ?? "",
          end_date: existingRoom?.end_date ?? "",
        },
        ...withoutRoom,
      ];
    });
  }

  function setRoomDates(patch: Partial<ResourceClaimInput>) {
    setResourceClaims((prev) =>
      prev.map((c, i) => (i === roomClaimIndex ? { ...c, ...patch } : c))
    );
  }

  function addVehicleClaim() {
    setResourceClaims((prev) => [
      ...prev,
      {
        resource_id: vehicleOptions[0]?.id ?? "",
        start_date: "",
        end_date: "",
      },
    ]);
  }

  function updateResourceClaim(
    index: number,
    patch: Partial<ResourceClaimInput>
  ) {
    setResourceClaims((prev) =>
      prev.map((claim, i) => (i === index ? { ...claim, ...patch } : claim))
    );
  }

  function removeResourceClaim(index: number) {
    setResourceClaims((prev) => prev.filter((_, i) => i !== index));
  }

  function addDriverClaim() {
    setDriverClaims((prev) => [
      ...prev,
      { window_id: driverWindows[0]?.id ?? 0, slot_date: "" },
    ]);
  }

  function updateDriverClaim(index: number, patch: Partial<DriverClaimInput>) {
    setDriverClaims((prev) =>
      prev.map((claim, i) => (i === index ? { ...claim, ...patch } : claim))
    );
  }

  function removeDriverClaim(index: number) {
    setDriverClaims((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <form action={formAction} className="space-y-8">
      <input
        type="hidden"
        name="resource_claims"
        value={JSON.stringify(resourceClaimsForSubmission)}
      />
      <input
        type="hidden"
        name="driver_claims"
        value={JSON.stringify(driverClaims)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="guest_name"
            className="block text-sm font-medium text-guest-ink"
          >
            Guest name
          </label>
          <input
            id="guest_name"
            name="guest_name"
            required
            className="mt-1 w-full rounded-md border border-guest-border px-3 py-2 text-sm text-guest-ink focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>
        <div>
          <label
            htmlFor="guest_contact"
            className="block text-sm font-medium text-guest-ink"
          >
            Contact (phone or email)
          </label>
          <input
            id="guest_contact"
            name="guest_contact"
            required
            className="mt-1 w-full rounded-md border border-guest-border px-3 py-2 text-sm text-guest-ink focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-guest-ink"
        >
          Notes <span className="text-guest-muted">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder="e.g. booked via Facebook Messenger"
          className="mt-1 w-full rounded-md border border-guest-border px-3 py-2 text-sm text-guest-ink focus:border-guest-navy focus:outline-none focus:ring-1 focus:ring-guest-navy"
        />
      </div>

      <div>
        <h2 className="text-sm font-medium text-guest-ink">Room</h2>
        <p className="mt-1 text-xs text-guest-muted">
          One room per booking — vehicles (below) require a room and use
          its dates.
        </p>

        <div className="mt-3 grid grid-cols-1 items-end gap-3 rounded-md border border-guest-border p-3 sm:grid-cols-[2fr_1fr_1fr]">
          <div>
            <label className="block text-xs text-guest-muted">Room</label>
            <select
              value={roomClaim?.resource_id ?? ""}
              onChange={(e) => setRoom(e.target.value)}
              className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {roomOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-guest-muted">Check-in</label>
            <input
              type="date"
              disabled={!roomClaim}
              min={today || undefined}
              value={roomClaim?.start_date ?? ""}
              onChange={(e) => setRoomDates({ start_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm disabled:bg-guest-band disabled:text-guest-muted"
            />
          </div>
          <div>
            <label className="block text-xs text-guest-muted">Check-out</label>
            <input
              type="date"
              disabled={!roomClaim}
              min={roomClaim?.start_date || today || undefined}
              value={roomClaim?.end_date ?? ""}
              onChange={(e) => setRoomDates({ end_date: e.target.value })}
              className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm disabled:bg-guest-band disabled:text-guest-muted"
            />
          </div>
        </div>

        {roomClaim && (
          <div className="mt-3 max-w-[160px]">
            <label
              htmlFor="guest_count"
              className="block text-xs text-guest-muted"
            >
              Guests
            </label>
            <input
              id="guest_count"
              name="guest_count"
              type="number"
              min={1}
              max={roomResource?.max_occupancy ?? undefined}
              value={guestCount}
              onChange={(e) => setGuestCount(e.target.value)}
              className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm"
            />
            {roomResource?.base_occupancy != null &&
              roomResource?.max_occupancy != null && (
                <p className="mt-1 text-xs text-guest-muted">
                  {roomResource.base_occupancy} included · max{" "}
                  {roomResource.max_occupancy}
                </p>
              )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-guest-ink">Vehicles</h2>
          {roomClaim && (
            <button
              type="button"
              onClick={addVehicleClaim}
              className="text-sm text-guest-muted hover:text-guest-ink"
            >
              + Add vehicle
            </button>
          )}
        </div>

        {!roomClaim ? (
          <p className="mt-2 text-sm text-guest-muted">Add a room first.</p>
        ) : vehicleRows.length === 0 ? (
          <p className="mt-2 text-sm text-guest-muted">None added yet.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {vehicleRows.map(({ claim, index }) => (
              <div
                key={index}
                className="grid grid-cols-1 items-end gap-3 rounded-md border border-guest-border p-3 sm:grid-cols-[2fr_2fr_auto]"
              >
                <div>
                  <label className="block text-xs text-guest-muted">
                    Vehicle
                  </label>
                  <select
                    value={claim.resource_id}
                    onChange={(e) =>
                      updateResourceClaim(index, {
                        resource_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm"
                  >
                    {vehicleOptions.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-guest-muted">
                    Dates
                  </label>
                  <p className="mt-1 rounded-md bg-guest-band px-2 py-1.5 text-sm text-guest-muted">
                    {roomClaim.start_date && roomClaim.end_date
                      ? `Uses room's dates: ${roomClaim.start_date} → ${roomClaim.end_date}`
                      : "Add room check-in/check-out dates first"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeResourceClaim(index)}
                  className="justify-self-start text-sm text-red-600 hover:text-red-800 sm:justify-self-center"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver slots */}
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-guest-ink">
            Driver time slots
          </h2>
          <button
            type="button"
            onClick={addDriverClaim}
            className="text-sm text-guest-muted hover:text-guest-ink"
          >
            + Add driver slot
          </button>
        </div>
        <p className="mt-1 text-xs text-guest-muted">
          Pickup/drop-off, chauffeured rental, and fishing trips all share the same one driver — only one of these can be booked per window, 
          per day, regardless of which service it&apos;s for.
        </p>

        {driverClaims.length === 0 && (
          <p className="mt-2 text-sm text-guest-muted">None added yet.</p>
        )}

        <div className="mt-3 space-y-3">
          {driverClaims.map((claim, i) => (
            <div
              key={i}
              className="grid grid-cols-1 items-end gap-3 rounded-md border border-guest-border p-3 sm:grid-cols-[2fr_1fr_auto]"
            >
              <div>
                <label className="block text-xs text-guest-muted">
                  Time window
                </label>
                <select
                  value={claim.window_id}
                  onChange={(e) =>
                    updateDriverClaim(i, {
                      window_id: Number(e.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm"
                >
                  {driverWindows.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} (₱{w.price_php})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-guest-muted">Date</label>
                <input
                  type="date"
                  value={claim.slot_date}
                  onChange={(e) =>
                    updateDriverClaim(i, { slot_date: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-guest-border px-2 py-1.5 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeDriverClaim(i)}
                className="justify-self-start text-sm text-red-600 hover:text-red-800 sm:justify-self-center"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {(roomClaim || driverClaims.length > 0) && (
        <div className="rounded-lg border border-guest-border bg-guest-band p-4">
          <h2 className="text-sm font-medium text-guest-ink">Total</h2>
          <dl className="mt-2 space-y-1 text-sm text-guest-muted">
            {roomClaim && (
              <div className="flex justify-between">
                <dt>
                  Room (₱{roomResource?.nightly_rate_php ?? 0} × {nights}{" "}
                  night{nights === 1 ? "" : "s"})
                </dt>
                <dd>₱{roomSubtotal.toFixed(2)}</dd>
              </div>
            )}
            {extraGuests > 0 && (
              <div className="flex justify-between">
                <dt>
                  Extra guests ({extraGuests} × ₱
                  {roomResource?.extra_guest_fee_php ?? 0})
                </dt>
                <dd>₱{extraGuestTotal.toFixed(2)}</dd>
              </div>
            )}
            {roomClaim && (
              <div className="flex justify-between">
                <dt>Cleaning fee</dt>
                <dd>₱{cleaningFee.toFixed(2)}</dd>
              </div>
            )}
            {driverClaims.length > 0 && (
              <div className="flex justify-between">
                <dt>Driver slot{driverClaims.length === 1 ? "" : "s"}</dt>
                <dd>₱{driverTotal.toFixed(2)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-2 flex justify-between border-t border-guest-border pt-2 text-sm font-medium text-guest-ink">
            <span>Calculated total</span>
            <span>₱{calculatedTotal.toFixed(2)}</span>
          </div>

          <div className="mt-3">
            <label
              htmlFor="final_total_php"
              className="block text-xs text-guest-muted"
            >
              Override total (optional) — leave blank to charge the
              calculated amount
            </label>
            <input
              id="final_total_php"
              name="final_total_php"
              type="number"
              min={0}
              step="0.01"
              placeholder={calculatedTotal.toFixed(2)}
              value={overrideTotal}
              onChange={(e) => setOverrideTotal(e.target.value)}
              className="mt-1 w-full max-w-[160px] rounded-md border border-guest-border px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="guest-btn rounded-md bg-guest-navy px-4 py-2 text-sm font-medium text-white hover:bg-guest-navy-dark disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create booking"}
      </button>
    </form>
  );
}
