"use server";

import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskChatbotResult = {
  answer: string | null;
  error: string | null;
};

async function buildGroundingContext(): Promise<string> {
  const supabase = await createClient();
  const { data: rooms } = await supabase
    .from("resources")
    .select(
      "label, nightly_rate_php, base_occupancy, max_occupancy, extra_guest_fee_php, cleaning_fee_php, overview, amenities"
    )
    .eq("is_active", true)
    .in("type", ["room_2br", "room_studio"])
    .order("nightly_rate_php");

  const roomLines = (rooms ?? [])
    .map((r) => {
      const amenities = r.amenities?.length
        ? r.amenities.join(", ")
        : "not listed";
      return `- ${r.label}: ₱${r.nightly_rate_php}/night, sleeps ${r.base_occupancy} (up to ${r.max_occupancy} with an extra-guest fee of ₱${r.extra_guest_fee_php}), cleaning fee ₱${r.cleaning_fee_php}. Amenities: ${amenities}.`;
    })
    .join("\n");

  return `
LOCATION: Mactan Island, Lapu-Lapu City, Philippines. One property, not multiple locations.

ROOMS CURRENTLY BOOKABLE ONLINE:
${roomLines || "(none currently listed)"}

CHECK-IN / CHECK-OUT (as published on every room's page): check-in from 2:00 PM, check-out by 11:00 AM.

HOUSE RULES (as published on every room's page): no smoking indoors, no pets allowed, quiet hours 10PM-7AM.

CANCELLATION POLICY: Free cancellation up to 3 days before check-in, full refund. Less than 3 days before check-in, or a no-show, is not eligible for a refund. Cancellations are handled directly by the Owner via email.

CONTACT: Facebook Messenger at m.me/wnjservices

PAYMENT: Online payment is not available yet. Booking through the site reserves the room; no card or online payment is charged.
`.trim();
}

const SYSTEM_PROMPT_INSTRUCTIONS = `
You are the FAQ assistant for WnJ Comfy Homes, a small family-run vacation rental on Mactan Island, Philippines. You are embedded in a chat widget on their booking website.

Answer ONLY using the facts given to you below. Do not invent, guess, or assume anything not explicitly stated here — not prices, not policies, not amenities, not parking, not anything else. If a guest asks about something not covered by these facts (for example: parking availability, specific pet exceptions, early check-in, anything about a room or service not listed), say plainly that you're not certain and point them to Facebook Messenger (m.me/wnjservices) to ask directly. Never make up a plausible-sounding answer.

Keep answers short — two or three sentences at most, plain conversational text, no markdown formatting.

Only answer questions about this property (rooms, pricing, policies, location, amenities, booking). If asked something unrelated, politely redirect to what you can help with.
`.trim();

export async function askChatbot(
  userMessage: string,
  history: ChatMessage[]
): Promise<AskChatbotResult> {
  const trimmed = userMessage.trim();
  if (!trimmed) {
    return { answer: null, error: "Message can't be empty." };
  }
  if (trimmed.length > 500) {
    return {
      answer: null,
      error: "Message too long — please keep questions under 500 characters.",
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      answer: null,
      error:
        "The chat assistant isn't configured yet — GEMINI_API_KEY is missing from the environment.",
    };
  }

  const grounding = await buildGroundingContext();

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: `${SYSTEM_PROMPT_INSTRUCTIONS}\n\nFACTS YOU MAY USE:\n${grounding}`,
              },
            ],
          },
          // Gemini uses "model" for the assistant's own turns, not
          // "assistant" — translated here so the exported ChatMessage
          // type (and the widget that uses it) stays provider-agnostic.
          contents: [
            ...history.map((m) => ({
              role: m.role === "user" ? "user" : "model",
              parts: [{ text: m.content }],
            })),
            { role: "user", parts: [{ text: trimmed }] },
          ],
          generationConfig: {
            maxOutputTokens: 900,
            thinkingConfig: {
              thinkingLevel: "low",
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const bodyText = await response.text();
      return {
        answer: null,
        error: `Chat request failed (${response.status}): ${bodyText.slice(0, 200)}`,
      };
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text as
      | string
      | undefined;

    if (!answer) {
      return { answer: null, error: "No response from the assistant." };
    }

    return { answer, error: null };
  } catch (err) {
    return {
      answer: null,
      error: err instanceof Error ? err.message : "Chat request failed.",
    };
  }
}
