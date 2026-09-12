"use client";

import { useState } from "react";
import { askStatsAgent, type StatsChatMessage } from "./stats-agent-actions";

type Message = { from: "bot" | "user"; text: string };

const SUGGESTED_QUESTIONS = [
  "How did this month compare to last month?",
  "Which room brings in the most revenue?",
  "What's my average occupancy this year?",
];

export function StatsChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "Ask me about your revenue, bookings, or occupancy — I can only answer from your real numbers, nothing guessed.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const history: StatsChatMessage[] = messages
      .filter((m, i) => !(i === 0 && m.from === "bot"))
      .map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setDraft("");
    setIsTyping(true);

    const result = await askStatsAgent(trimmed, history);

    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text: result.answer ?? result.error ?? "Something went wrong.",
      },
    ]);
  }

  return (
    <div className="rounded-[14px] bg-white p-5">
      <h2 className="mb-3 text-base font-normal text-guest-ink">
        Ask Your Stats
      </h2>

      <div className="mb-3 flex max-h-[280px] flex-col gap-2.5 overflow-y-auto rounded-lg bg-guest-band p-3.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                m.from === "user"
                  ? "bg-guest-navy text-white"
                  : "border border-guest-border bg-white text-guest-ink"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="self-start rounded-xl border border-guest-border bg-white px-3 py-2 text-[13px] text-guest-muted">
            thinking…
          </div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => sendMessage(q)}
            disabled={isTyping}
            className="rounded-full border border-guest-border bg-guest-band px-3 py-1.5 text-[11px] text-guest-ink disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") sendMessage(draft);
          }}
          placeholder="Ask a question about your numbers..."
          disabled={isTyping}
          maxLength={500}
          className="flex-1 rounded-full border border-guest-border px-3.5 py-2 text-[13px]"
        />
        <button
          type="button"
          onClick={() => sendMessage(draft)}
          disabled={isTyping || !draft.trim()}
          className="guest-btn flex-none rounded-full bg-guest-navy px-4 py-2 text-[13px] text-white disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
