"use server";

import { createClient } from "@/lib/supabase/server";
import { getStatsHistory, getReviewSummary } from "./stats-data";

export type StatsChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskStatsAgentResult = {
  answer: string | null;
  error: string | null;
};

const SYSTEM_PROMPT_INSTRUCTIONS = `
You are a business analytics assistant for the Owner of WnJ Comfy Homes, a small vacation rental on Mactan Island, Philippines. You are embedded in their private management dashboard — this is NOT guest-facing, you are speaking directly to the business Owner.

Answer ONLY using the monthly data given to you below. Do not invent, guess, estimate, or extrapolate any number not directly derivable from that data. If the Owner asks about something the data doesn't cover (a future prediction, a comparison to a period outside the given history, marketing advice not grounded in these numbers), say plainly that you don't have that data rather than guessing.

When asked to compare periods, do the actual arithmetic correctly using only the numbers given — show your comparison in plain terms (e.g. "up 12%" or "₱4,200 higher"), not vague impressions.

Revenue figures only count bookings the Owner has personally verified as paid — mention this distinction if it's relevant to the Owner's question (e.g. if asking about "total income" vs "bookings").

Keep answers conversational and concise — a few sentences, plain text, no markdown tables or headers.
`.trim();

export async function askStatsAgent(
  userMessage: string,
  history: StatsChatMessage[]
): Promise<AskStatsAgentResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { answer: null, error: "Not signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return { answer: null, error: "Only the Owner can use this." };
  }

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
        "The stats assistant isn't configured yet — GEMINI_API_KEY is missing from the environment.",
    };
  }

  const [monthlyHistory, reviewSummary] = await Promise.all([
    getStatsHistory(supabase),
    getReviewSummary(supabase),
  ]);

  const historyLines = monthlyHistory
    .map((m) => {
      const occupancyLines = Object.entries(m.occupancyByRoom)
        .map(([label, pct]) => `${label}: ${pct}%`)
        .join(", ");
      return `- ${m.monthLabel}: revenue ₱${m.revenuePhp.toFixed(2)} (verified only), ${m.bookingsCount} booking(s), occupancy — ${occupancyLines || "no active rooms"}.`;
    })
    .join("\n");

  const reviewLine =
    reviewSummary.count > 0
      ? `Approved guest reviews: ${reviewSummary.count}, average rating ${reviewSummary.averageRating} out of 5.`
      : "No approved guest reviews yet.";

  const grounding = `
MONTHLY HISTORY (oldest to newest, last 12 months):
${historyLines}

${reviewLine}
`.trim();

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
                text: `${SYSTEM_PROMPT_INSTRUCTIONS}\n\nDATA YOU MAY USE:\n${grounding}`,
              },
            ],
          },
          contents: [
            ...history.map((m) => ({
              role: m.role === "user" ? "user" : "model",
              parts: [{ text: m.content }],
            })),
            { role: "user", parts: [{ text: trimmed }] },
          ],
          generationConfig: {
            maxOutputTokens: 1200,
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
        error: `Request failed (${response.status}): ${bodyText.slice(0, 200)}`,
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
      error: err instanceof Error ? err.message : "Request failed.",
    };
  }
}
