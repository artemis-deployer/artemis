"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal } from "lucide-react";
import { parseDraftReply } from "../lib/draft";
import { useDraft } from "./DraftContext";

type Line = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Community coin for a local arts club",
  "Gaming token called RAID on Robinhood Chain",
  "Simple launch: 500M tokens with 0.5 liquidity",
];

const OFFLINE_LINE = "AI offline · configure parameters in the form directly.";

export default function StudioChat() {
  const { setDraft } = useDraft();
  const [log, setLog] = useState<Line[]>([
    {
      role: "assistant",
      content:
        "Tell me about your coin idea or community, and I'll draft the launch parameters for you.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log, busy]);

  async function send(text: string) {
    const content = text.trim().slice(0, 1000);
    if (!content || busy) return;
    setBusy(true);
    const next = [...log, { role: "user" as const, content }];
    setLog(next);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });

      if (res.status === 400) {
        setLog([
          ...next,
          {
            role: "assistant" as const,
            content: "Message exceeds character limit or could not be processed. Try again with a shorter prompt.",
          },
        ]);
        return;
      }

      const json = (await res.json()) as { reply?: string; error?: string };
      const reply = json.reply ?? OFFLINE_LINE;
      setLog([...next, { role: "assistant" as const, content: reply }]);

      const patch = parseDraftReply(reply);
      if (Object.keys(patch).length > 0) {
        setDraft((prev) => ({ ...prev, ...patch }));
      }
    } catch {
      setLog([...next, { role: "assistant" as const, content: OFFLINE_LINE }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chat-card" aria-label="Talk to Kentir">
      <div className="chat-card-header">
        <div className="chat-card-header-title">
          <span>Kentir Copilot</span>
        </div>
        <span className="text-xs text-[var(--muted)]">Draft fills as you chat</span>
      </div>

      <div className="chat-history" aria-live="polite" ref={logRef}>
        {log.map((l, i) => (
          <div
            key={i}
            data-role={l.role}
            className={`chat-bubble ${l.role === "user" ? "chat-bubble-user" : "chat-bubble-assistant"}`}
          >
            <span className="chat-bubble-author">
              {l.role === "user" ? "You" : "Kentir"}
            </span>
            <p className="m-0 whitespace-pre-wrap leading-relaxed">{l.content}</p>
          </div>
        ))}

        {busy && (
          <div className="chat-bubble chat-bubble-assistant text-xs text-[var(--muted)]">
            <span>Thinking…</span>
          </div>
        )}
      </div>

      <div className="chat-suggestions">
        <span className="text-xs text-[var(--muted)] font-semibold uppercase tracking-wider">
          Suggestions:
        </span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="suggestion-chip"
            disabled={busy}
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="chat-input-form"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="chat-input-wrapper">
          <textarea
            id="chat-input"
            rows={2}
            maxLength={1000}
            value={input}
            placeholder="Type your coin idea..."
            className="chat-textarea"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="chat-send-btn"
            aria-label="Send message"
          >
            <SendHorizonal size={16} />
            <span>Send</span>
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>Enter to send · Shift+Enter for new line</span>
          <span>{input.length}/1000</span>
        </div>
      </form>
    </section>
  );
}
