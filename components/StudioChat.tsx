"use client";

import { useEffect, useRef, useState } from "react";
import { parseDraftReply } from "../lib/draft";
import { useDraft } from "./DraftContext";

type Line = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["A coin for my community", "Help me name my coin"];
const OFFLINE_LINE = "AI offline · use the form directly.";

export default function StudioChat() {
  const { draft, setDraft } = useDraft();
  const [log, setLog] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
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
        setLog([...next, { role: "assistant" as const, content: "That message did not go through. Keep it under 1000 characters and try again." }]);
        return;
      }
      const json = (await res.json()) as { reply?: string };
      const reply = json.reply ?? OFFLINE_LINE;
      setLog([...next, { role: "assistant" as const, content: reply }]);
      const patch = parseDraftReply(reply);
      setDraft({ ...draft, ...patch });
    } catch {
      setLog([...next, { role: "assistant" as const, content: OFFLINE_LINE }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Talk to Kentir">
      <div aria-live="polite" ref={logRef}>
        {log.map((l, i) => (
          <p key={i} data-role={l.role}>
            <strong>{l.role === "user" ? "You" : "Kentir"}:</strong> {l.content}
          </p>
        ))}
        {busy && (
          <p className="thinking" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="chat-input">Tell Kentir about your coin</label>
        <textarea id="chat-input" rows={2} maxLength={1000} value={input} onChange={(e) => setInput(e.target.value)} />
        <span className="enter-hint">Enter to send</span>
        <button type="submit" disabled={busy} aria-label="Send message">
          Send
        </button>
      </form>
      <div>
        <span>Try an idea</span>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" disabled={busy} onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
