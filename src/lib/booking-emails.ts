import { getResendClient, RESEND_FROM_EMAIL } from "./resend";

type BookingEmailDetails = {
  guestName: string;
  guestEmail: string | null;
  roomLabel: string;
  startDate: string;
  endDate: string;
  totalPhp: number | null;
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function sendBookingConfirmationEmail(
  details: BookingEmailDetails
) {
  if (!details.guestEmail) return;

  const total =
    details.totalPhp != null ? `₱${details.totalPhp.toFixed(2)}` : "—";

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #1c274c;">Booking Confirmed</h2>
      <p>Hi ${details.guestName},</p>
      <p>Your stay at WnJ Comfy Homes is confirmed. Here are your details:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #8a8a8a;">Room</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.roomLabel}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a8a8a;">Check-in</td><td style="padding: 6px 0; text-align: right;">${formatDate(details.startDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a8a8a;">Check-out</td><td style="padding: 6px 0; text-align: right;">${formatDate(details.endDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a8a8a; border-top: 1px solid #ececec;">Total</td><td style="padding: 6px 0; text-align: right; font-weight: 600; border-top: 1px solid #ececec;">${total}</td></tr>
      </table>
      <p style="font-size: 13px; color: #8a8a8a;">
        No payment has been taken yet. This email confirms your reservation.
        If you have any questions, message us on Facebook:
        <a href="https://m.me/wnjservices">m.me/wnjservices</a>.
      </p>
    </div>
  `;

  try {
    const { error } = await getResendClient().emails.send({
      from: RESEND_FROM_EMAIL,
      to: details.guestEmail,
      subject: `Booking confirmed — ${details.roomLabel}`,
      html,
    });
    if (error) {
      console.error("Booking confirmation email failed:", error);
    }
  } catch (err) {
    console.error("Booking confirmation email failed:", err);
  }
}

export async function sendCancellationEmail(
  details: BookingEmailDetails & { reason: string }
) {
  if (!details.guestEmail) return;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #a61b1b;">Booking Cancelled</h2>
      <p>Hi ${details.guestName},</p>
      <p>
        We're sorry to let you know your booking at WnJ Comfy Homes has been
        cancelled by the property owner.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #8a8a8a;">Room</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${details.roomLabel}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a8a8a;">Check-in</td><td style="padding: 6px 0; text-align: right;">${formatDate(details.startDate)}</td></tr>
        <tr><td style="padding: 6px 0; color: #8a8a8a;">Check-out</td><td style="padding: 6px 0; text-align: right;">${formatDate(details.endDate)}</td></tr>
      </table>
      <p style="background: #fdf2f2; border-radius: 8px; padding: 12px; font-size: 14px;">
        <strong>Reason:</strong> ${details.reason}
      </p>
      <p style="font-size: 13px; color: #8a8a8a;">
        We're sorry for the inconvenience. If you'd like to rebook or have
        any questions, message us on Facebook:
        <a href="https://m.me/wnjservices">m.me/wnjservices</a>.
      </p>
    </div>
  `;

  try {
    const { error } = await getResendClient().emails.send({
      from: RESEND_FROM_EMAIL,
      to: details.guestEmail,
      subject: `Your booking has been cancelled — ${details.roomLabel}`,
      html,
    });
    if (error) {
      console.error("Cancellation email failed:", error);
    }
  } catch (err) {
    console.error("Cancellation email failed:", err);
  }
}
