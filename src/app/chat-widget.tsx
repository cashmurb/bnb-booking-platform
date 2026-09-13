"use client";

import { useState } from "react";
import { askChatbot, type ChatMessage } from "./chatbot-actions";

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "What time is check-in / check-out?",
    answer: "Check-in is from 2:00 PM and check-out is by 11:00 AM.",
  },
  {
    question: "Is parking available?",
    answer:
      "I'm not certain if parking is available — please message us on Facebook (m.me/wnjservices) to ask about this.",
  },
  {
    question: "Do you allow pets?",
    answer: "No, pets aren't allowed at any of our units.",
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Free cancellation up to 3 days before check-in for a full refund. Less than 3 days before check-in, or a no-show, isn't eligible for a refund. Cancellations are handled directly by the Owner — message us on Facebook (m.me/wnjservices) with your booking reference.",
  },
  {
    question: "Is there WiFi and AC?",
    answer: "Yes — all of our rooms include WiFi and air conditioning.",
  },
];

type Message = { from: "bot" | "user"; text: string };

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      from: "bot",
      text: "Hi! I'm the WnJ Comfy Homes assistant. Ask me a question below, or use one of the quick questions to get started.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  function askFaq(item: { question: string; answer: string }) {
    if (isTyping) return;
    setMessages((prev) => [
      ...prev,
      { from: "user", text: item.question },
      { from: "bot", text: item.answer },
    ]);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const history: ChatMessage[] = messages
      .filter((m, i) => !(i === 0 && m.from === "bot"))
      .map((m) => ({
        role: m.from === "user" ? "user" : "assistant",
        content: m.text,
      }));

    setMessages((prev) => [...prev, { from: "user", text: trimmed }]);
    setDraft("");
    setIsTyping(true);

    const result = await askChatbot(trimmed, history);

    setIsTyping(false);
    setMessages((prev) => [
      ...prev,
      {
        from: "bot",
        text:
          result.answer ??
          "Sorry, I couldn't get an answer just now — please message us on Facebook (m.me/wnjservices) and we'll help directly.",
      },
    ]);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {isOpen && (
        // w-[min(320px,calc(100vw-48px))], not a fixed w-80 — on a
        // narrow phone (320px wide, still common on older/budget
        // devices), a fixed 320px panel plus the 24px right offset
        // exceeded the screen width entirely, clipping the widget off
        // the left edge. Confirmed by actually rendering both widths,
        // not just reasoning about it — the fixed version overflowed
        // exactly like this in practice, not just in theory.
        <div className="flex max-h-[85vh] w-[min(320px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border border-guest-border bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-guest-navy px-4 py-3.5 text-white">
            <div>
              <div className="text-sm font-bold">WnJ Comfy Homes</div>
              <div className="text-[11px] opacity-75">
                Usually replies within an hour
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-lg leading-none"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          <div className="flex min-h-[100px] flex-1 flex-col gap-2.5 overflow-y-auto bg-guest-band p-3.5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
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
              <div className="self-start rounded-xl border border-guest-border bg-white px-3 py-2 text-xs text-guest-muted">
                typing…
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-guest-border p-2.5">
            {FAQ_ITEMS.map((item) => (
              <button
                key={item.question}
                type="button"
                onClick={() => askFaq(item)}
                disabled={isTyping}
                className="rounded-full border border-guest-border bg-guest-band px-3 py-1.5 text-[11px] text-guest-ink disabled:opacity-50"
              >
                {item.question}
              </button>
            ))}
          </div>

          <div className="border-t border-guest-border p-2.5">
            <a
              href="https://m.me/wnjservices"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg border border-guest-navy py-2 text-center text-xs font-semibold text-guest-navy"
            >
              Talk to the Owner Instead
            </a>
          </div>

          <div className="flex gap-2 border-t border-guest-border p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage(draft);
              }}
              placeholder="Type your question..."
              disabled={isTyping}
              maxLength={500}
              className="flex-1 rounded-full border border-guest-border px-3 py-1.5 text-xs"
            />
            <button
              type="button"
              onClick={() => sendMessage(draft)}
              disabled={isTyping || !draft.trim()}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-guest-navy text-sm text-white disabled:opacity-50"
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="guest-btn flex h-14 w-14 items-center justify-center rounded-full bg-guest-navy text-white shadow-lg"
        aria-label="Open chat"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 4h16v12H7l-3 3V4z"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
