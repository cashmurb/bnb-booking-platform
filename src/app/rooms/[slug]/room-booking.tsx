"use client";

import { jsPDF } from "jspdf";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  checkOccupiedDates,
  confirmCurrentHold,
  releaseCurrentHold,
  syncHold,
  updateHoldDetails,
} from "../../guest-actions";
import { GuestFooter } from "../../guest-footer";
import { ChatWidget } from "../../chat-widget";
import { LocationPinIcon, PeopleIcon, CheckCircleIcon } from "../../icons";
import type { Resource, GuestHold } from "@/lib/types";

type Step = "details" | "review" | "success";

function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function minutesUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 60000));
}

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RoomBooking({
  room,
  photos,
}: {
  room: Resource;
  photos: string[];
}) {
  const [step, setStep] = useState<Step>("details");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    "card" | "gcash" | "bank_transfer"
  >("card");

  const [occupiedDates, setOccupiedDates] = useState<string[]>([]);
  const [checkingDates, setCheckingDates] = useState(false);

  const [hold, setHold] = useState<GuestHold | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const bookingReference = confirmedId
    ? confirmedId.slice(0, 8).toUpperCase()
    : null;
  const [today, setToday] = useState<string>("");
  const IMAGE_COUNT = photos.length;
  const [imageIndex, setImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const prevImage = useCallback(() => {
    if (IMAGE_COUNT === 0) return;
    setImageIndex((i) => (i - 1 + IMAGE_COUNT) % IMAGE_COUNT);
  }, [IMAGE_COUNT]);
  const nextImage = useCallback(() => {
    if (IMAGE_COUNT === 0) return;
    setImageIndex((i) => (i + 1) % IMAGE_COUNT);
  }, [IMAGE_COUNT]);
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 50;
    if (deltaX > SWIPE_THRESHOLD) prevImage();
    else if (deltaX < -SWIPE_THRESHOLD) nextImage();
    touchStartX.current = null;
  }

  useEffect(() => {
    const id = setTimeout(() => setToday(todayDateString()), 0);
    return () => clearTimeout(id);
  }, []);

  const nights = nightsBetween(startDate, endDate);
  const guestCountNum = guestCount ? Number(guestCount) : 0;

  const extraGuests =
    room.base_occupancy != null
      ? Math.max(0, guestCountNum - room.base_occupancy)
      : 0;
  const roomSubtotal = (room.nightly_rate_php ?? 0) * nights;
  const extraGuestTotal = extraGuests * (room.extra_guest_fee_php ?? 0);
  const cleaningFee = room.cleaning_fee_php ?? 0;
  const previewTotal = roomSubtotal + extraGuestTotal + cleaningFee;

  const hasValidRange = !!(startDate && endDate && endDate > startDate);

  async function checkDatesForRoom(start: string, end: string) {
    if (!start || !end || end <= start) {
      setOccupiedDates([]);
      return;
    }
    setCheckingDates(true);
    const res = await checkOccupiedDates(room.id, start, end);
    setOccupiedDates(res.dates);
    setCheckingDates(false);
  }

  const hasConflict = hasValidRange && occupiedDates.length > 0;

  useEffect(() => {
    if (!hold?.holdExpiresAt) return;
    const holdExpiresAt = hold.holdExpiresAt;
    function tick() {
      setMinutesLeft(minutesUntil(holdExpiresAt));
    }
    const firstTick = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 30000);
    return () => {
      clearTimeout(firstTick);
      clearInterval(intervalId);
    };
  }, [hold?.holdExpiresAt]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsLightboxOpen(false);
      else if (e.key === "ArrowLeft") prevImage();
      else if (e.key === "ArrowRight") nextImage();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen, prevImage, nextImage]);

  const canReserve =
    !!startDate &&
    !!endDate &&
    endDate > startDate &&
    !hasConflict &&
    !checkingDates &&
    guestCountNum > 0 &&
    guestName.trim() !== "" &&
    guestContact.trim() !== "";

  async function handleReserve() {
    if (!canReserve) return;
    setPending(true);
    setError(null);
    const result = await syncHold({
      guestName: guestName.trim(),
      guestContact: guestContact.trim(),
      guestCount: guestCountNum,
      room: { resourceId: room.id, startDate, endDate },
      driverSlots: [],
    });
    setPending(false);
    if (result.error || !result.hold) {
      setError(result.error ?? "Something went wrong. Please try again.");
      return;
    }
    setHold(result.hold);
    setStep("review");
  }
  const looksLikeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail.trim());
  const canConfirm = looksLikeEmail && !pending;

  async function handleConfirm() {
    if (!canConfirm) return;
    setPending(true);
    setError(null);

    const detailsResult = await updateHoldDetails({
      guestEmail: guestEmail.trim(),
      notes: specialRequests.trim() || undefined,
      paymentMethod,
    });
    if (!detailsResult.success) {
      setPending(false);
      setError(
        detailsResult.error ?? "Could not save your details. Please try again."
      );
      return;
    }

    const result = await confirmCurrentHold();
    setPending(false);
    if (result.error || !result.success) {
      setError(
        result.error ?? "Could not confirm your booking. Please try again."
      );
      return;
    }
    setConfirmedId(result.bookingId);
    setStep("success");
  }

  async function handleStartOver() {
    setPending(true);
    await releaseCurrentHold();
    setPending(false);
    setHold(null);
    setStartDate("");
    setEndDate("");
    setGuestCount("");
    setOccupiedDates([]);
    setError(null);
    setStep("details");
  }

  function downloadReceipt() {
    if (!confirmedId || !bookingReference) return;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 56;
    let y = 72;

    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.text("WnJ Comfy Homes", pageWidth / 2, y, { align: "center" });

    y += 22;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text("Booking Confirmation", pageWidth / 2, y, { align: "center" });
    doc.setTextColor(20);

    y += 30;
    doc.setDrawColor(220);
    doc.line(marginX, y, pageWidth - marginX, y);

    const rows: [string, string][] = [
      ["Booking Reference", bookingReference],
      ["Guest", guestName],
      ["Property", room.label],
      ["Dates", `${startDate}  to  ${endDate}`],
      ["Guests", String(guestCountNum)],
    ];
    if (hold) {
      rows.push(["Total", `PHP ${hold.finalTotalPhp.toFixed(2)}`]);
    }

    y += 30;
    doc.setFontSize(11);
    for (const [label, value] of rows) {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120);
      doc.text(label, marginX, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20);
      doc.text(value, pageWidth - marginX, y, { align: "right" });
      y += 24;
    }

    y += 20;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 30;
    doc.setFont("times", "italic");
    doc.setFontSize(10);
    doc.setTextColor(140);
    doc.text(
      "Thank you for booking with WnJ Comfy Homes.",
      pageWidth / 2,
      y,
      { align: "center" }
    );

    doc.save(`WnJ-Receipt-${bookingReference}.pdf`);
  }

  if (step === "success") {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-guest-band text-guest-navy">
            <CheckCircleIcon className="h-8 w-8" />
          </div>
          <h1 className="font-serif text-2xl font-normal text-guest-ink">
            Booking Confirmed
          </h1>
          <p className="mt-2 mb-7 text-sm text-guest-muted">
            Thank you, {guestName}. We&apos;ll be in touch with any
            further details before your stay.
          </p>

          <div className="mb-6 flex flex-col gap-3 rounded-lg border border-guest-border p-5 text-left text-[13px]">
            {bookingReference && (
              <>
                <div className="flex justify-between text-guest-muted">
                  <span>Booking Reference</span>
                  <span className="font-semibold text-guest-ink">
                    {bookingReference}
                  </span>
                </div>
                <div className="h-px bg-guest-border" />
              </>
            )}
            <div className="flex justify-between">
              <span className="text-guest-muted">Property</span>
              <span className="font-semibold">{room.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-guest-muted">Dates</span>
              <span className="font-semibold">
                {startDate} – {endDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-guest-muted">Guests</span>
              <span className="font-semibold">{guestCountNum}</span>
            </div>
            {hold && (
              <>
                <div className="h-px bg-guest-border" />
                <div className="flex justify-between text-[15px] font-semibold">
                  <span>Total</span>
                  <span>₱{hold.finalTotalPhp.toFixed(2)}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={downloadReceipt}
              className="guest-btn rounded-md border border-guest-border px-5 py-2.5 text-[13px] text-guest-ink"
            >
              Download Receipt
            </button>
            <Link
              href="/"
              className="guest-btn inline-block rounded-md bg-guest-navy px-5 py-2.5 text-[13px] text-white"
            >
              Back to Home
            </Link>
          </div>
        </main>
        <GuestFooter maxWidthClassName="max-w-lg" />
        <ChatWidget />
      </div>
    );
  }

  if (step === "review" && hold) {
    return (
      <div className="flex min-h-screen flex-col">
        <main className="flex-1 mx-auto w-full max-w-[900px] px-6 py-10">
          <button
            type="button"
            onClick={() => setStep("details")}
            className="guest-btn text-[11px] text-guest-muted"
          >
            ← Back to {room.label}
          </button>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div className="rounded-[14px] border border-guest-border p-6">
              <h2 className="mb-3 font-serif text-lg text-guest-ink">
                Your Trip
              </h2>
              <div className="mb-6 flex justify-between text-sm">
                <span className="text-guest-muted">Dates</span>
                <span className="font-semibold text-guest-ink">
                  {startDate} – {endDate}
                </span>
              </div>
              <div className="-mt-4 mb-6 flex justify-between text-sm">
                <span className="text-guest-muted">Guests</span>
                <span className="font-semibold text-guest-ink">
                  {guestCountNum} guest{guestCountNum === 1 ? "" : "s"}
                </span>
              </div>

              <h2 className="mb-3 font-serif text-lg text-guest-ink">
                Guest Details
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    value={guestContact}
                    onChange={(e) => setGuestContact(e.target.value)}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                  <p className="mt-1 text-[11px] text-guest-muted">
                    Your booking reference goes here — double check it&apos;s
                    right.
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Special Requests
                  </label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                    className="w-full resize-y rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>
              </div>

              <h2 className="mb-3 mt-6 font-serif text-lg text-guest-ink">
                Payment Method
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                {(
                  [
                    { key: "card", label: "Credit/Debit Card" },
                    { key: "gcash", label: "GCash" },
                    { key: "bank_transfer", label: "Bank Transfer" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setPaymentMethod(opt.key)}
                    className={`guest-btn rounded border px-3 py-2.5 text-[13px] ${
                      paymentMethod === opt.key
                        ? "border-guest-navy bg-guest-band font-semibold text-guest-navy"
                        : "border-guest-border text-guest-ink"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-guest-muted">
                This is a preference for now, not a live charge. Payment processor is connected yet. The Owner will follow
                up on payment directly using the method you choose here.
              </p>
            </div>

            <aside className="h-fit rounded-[14px] border border-guest-border p-6">
              <h3 className="mb-1 text-base text-guest-ink">{room.label}</h3>
              <p className="mb-4 flex items-center gap-1 text-[11px] text-guest-muted">
                <LocationPinIcon className="h-3 w-3" />
                Mactan Island, Lapu-Lapu City, Philippines
              </p>

              <div className="flex flex-col gap-2 border-t border-guest-border pt-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-guest-muted">
                    ₱{room.nightly_rate_php} × {nights} night
                    {nights === 1 ? "" : "s"}
                  </span>
                  <span>₱{roomSubtotal.toFixed(2)}</span>
                </div>
                {extraGuests > 0 && (
                  <div className="flex justify-between">
                    <span className="text-guest-muted">
                      Extra guests ({extraGuests} × ₱
                      {room.extra_guest_fee_php})
                    </span>
                    <span>₱{extraGuestTotal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-guest-muted">Cleaning fee</span>
                  <span>₱{cleaningFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-guest-border pt-2 text-base font-semibold text-guest-navy">
                  <span>Total</span>
                  <span>₱{hold.finalTotalPhp.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <p className="mt-4 text-sm text-red-600">{error}</p>
              )}

              <button
                type="button"
                disabled={!canConfirm}
                onClick={handleConfirm}
                className="guest-btn mt-5 block w-full rounded bg-guest-navy px-4 py-3 text-center text-sm text-white disabled:opacity-50"
              >
                {pending ? "Confirming…" : "Confirm Booking"}
              </button>
              <p className="mt-3 text-center text-[11px] text-guest-muted">
                By continuing you agree to the{" "}
                <Link href="/cancellation-policy" className="underline">
                  cancellation policy
                </Link>
                .
              </p>
              <p className="mt-2 text-center text-[11px] text-guest-muted">
                No payment is taken yet — this confirms your reservation.
              </p>
            </aside>
          </div>
        </main>
        <GuestFooter maxWidthClassName="max-w-[900px]" />
        <ChatWidget />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 mx-auto max-w-[900px] px-6 py-10">
        <Link
          href="/rooms"
          className="guest-btn text-[11px] text-guest-muted"
        >
          ← Back to Rooms
        </Link>

        <div
          className="relative mb-8 mt-4 h-[300px] w-full overflow-hidden rounded-md border border-guest-border bg-guest-band"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {photos.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsLightboxOpen(true)}
              aria-label="View full-size photo"
              className="group relative h-full w-full cursor-zoom-in"
            >
              <Image
                src={photos[imageIndex]}
                alt={`${room.label} photo ${imageIndex + 1}`}
                fill
                className="object-cover"
                priority={imageIndex === 0}
              />
              <span className="absolute right-3 top-3 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                View full size
              </span>
            </button>
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs text-guest-muted">
                Photos coming soon
              </span>
            </div>
          )}

          {IMAGE_COUNT > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                aria-label="Previous photo"
                className="guest-btn absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-guest-ink shadow"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Next photo"
                className="guest-btn absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-guest-ink shadow"
              >
                ›
              </button>

              <div className="absolute bottom-3 left-1/2 flex max-w-[85%] -translate-x-1/2 flex-wrap justify-center gap-1.5">
                {Array.from({ length: IMAGE_COUNT }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 w-1.5 flex-none rounded-full ${
                      i === imageIndex ? "bg-guest-navy" : "bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
          <div>
            <div className="mb-8 rounded border border-guest-border p-5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <h1 className="text-[18px] font-semibold text-guest-ink">
                  {room.label}
                </h1>
                <span className="text-xs text-guest-muted">
                  ₱{room.nightly_rate_php} / day
                </span>
              </div>
              <p className="mb-3.5 flex items-center gap-1 text-[11px] text-guest-muted">
                <LocationPinIcon className="h-3 w-3" />
                Mactan Island, Lapu-Lapu City, Philippines
              </p>
              <p className="flex items-center gap-1 text-[11px] text-guest-muted">
                <PeopleIcon className="h-3.5 w-3.5" />
                Sleeps {room.base_occupancy}, up to {room.max_occupancy}{" "}
                with extra guests
              </p>
            </div>

            {room.overview && (
              <div className="mb-8">
                <h3 className="mb-2.5 text-[16px] font-normal text-guest-ink">
                  Overview
                </h3>
                <p className="text-xs leading-relaxed text-guest-muted">
                  {room.overview}
                </p>
              </div>
            )}

            {room.amenities && room.amenities.length > 0 && (
              <div className="mb-8">
                <h3 className="mb-2.5 text-[16px] font-normal text-guest-ink">
                  Room Amenities
                </h3>
                <p className="mb-3.5 text-xs leading-relaxed text-guest-muted">
                  Everything you need is included in your stay.
                </p>
                <div className="grid grid-cols-2 gap-x-5 gap-y-3.5 text-xs text-guest-ink sm:grid-cols-3">
                  {room.amenities.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-3.5 text-[16px] font-normal text-guest-ink">
                Booking Rules
              </h3>
              <div className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
                <div className="mb-1 font-semibold text-guest-ink">
                  Check-In
                </div>
                <div className="mb-1 font-semibold text-guest-ink">
                  Check-Out
                </div>
                <div className="text-guest-muted">
                  ✓ Check-in from 2:00 PM
                </div>
                <div className="text-guest-muted">
                  ✓ Check-out by 11:00 AM
                </div>
                <div className="text-guest-muted">✓ No smoking indoors</div>
                <div className="text-guest-muted">✓ No pets allowed</div>
                <div className="text-guest-muted">
                  ✓ Quiet hours 10PM–7AM
                </div>
              </div>
            </div>
          </div>
          <aside className="h-fit rounded border border-guest-border p-6">
            <h2 className="mb-5 text-[16px] font-normal text-guest-ink">
              {step === "review" ? "Review & Confirm" : "Book Room"}
            </h2>

            {hold && step !== "details" && (
              <div className="mb-4 rounded-md bg-guest-band px-3 py-2 text-sm text-guest-ink">
                Reserved for you
                {minutesLeft != null &&
                  ` — expires in about ${minutesLeft} min`}
                .{" "}
                <button
                  type="button"
                  onClick={handleStartOver}
                  disabled={pending}
                  className="text-guest-navy underline"
                >
                  Start over
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="mb-4 text-sm text-red-600">
                {error}
              </p>
            )}

            {step === "details" && (
              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={guestContact}
                    onChange={(e) => setGuestContact(e.target.value)}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Check-in Date *
                  </label>
                  <input
                    type="date"
                    min={today || undefined}
                    value={startDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStartDate(value);
                      checkDatesForRoom(value, endDate);
                    }}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    Check-out Date *
                  </label>
                  <input
                    type="date"
                    min={startDate || today || undefined}
                    value={endDate}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEndDate(value);
                      checkDatesForRoom(startDate, value);
                    }}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>

                {checkingDates && (
                  <p className="text-xs text-guest-muted">
                    Checking availability…
                  </p>
                )}
                {hasConflict && (
                  <p className="text-sm text-red-600">
                    Sorry, this room is already booked for part of that
                    range ({occupiedDates.join(", ")}). Try different
                    dates.
                  </p>
                )}

                <div>
                  <label className="mb-2 block text-xs text-guest-ink">
                    No. of Guest(s) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={room.max_occupancy ?? undefined}
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full rounded border border-guest-border px-3 py-2 text-[13px]"
                  />
                </div>

                {nights > 0 && (
                  <p className="text-sm text-guest-ink">
                    {nights} night{nights === 1 ? "" : "s"} — est. total ₱
                    {previewTotal.toFixed(2)}
                  </p>
                )}

                <button
                  type="button"
                  disabled={!canReserve || pending}
                  onClick={handleReserve}
                  className="guest-btn block w-full rounded bg-guest-navy px-4 py-3 text-center text-sm text-white disabled:opacity-50"
                >
                  {pending ? "Reserving…" : "Book Now"}
                </button>
              </div>
            )}
          </aside>
        </div>
      </main>

      <GuestFooter maxWidthClassName="max-w-[900px]" />
      <ChatWidget />

      {isLightboxOpen && photos && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            aria-label="Close full-size photo"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20"
          >
            ×
          </button>
          <div
            className="relative h-[85vh] w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[imageIndex]}
              alt={`${room.label} photo ${imageIndex + 1}, full size`}
              fill
              className="object-contain"
            />
          </div>

          {IMAGE_COUNT > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                aria-label="Previous photo"
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                aria-label="Next photo"
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
              >
                ›
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/70">
                {imageIndex + 1} / {IMAGE_COUNT}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
