"use client";

import { useState } from "react";
import { parseDraftReply } from "../lib/draft";
import { useDraft } from "./DraftContext";

type Line = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["A coin for my community", "Help me name my coin"];

export default function StudioChat() {
  const { draft, setDraft } = useDraft();
  const [log, setLog] = useState<Line[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

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
      const json = (await res.json()) as { reply?: string };
      const reply = json.reply ?? "AI offline · use the form directly.";
      setLog([...next, { role: "assistant" as const, content: reply }]);
      const patch = parseDraftReply(reply);
      setDraft({ ...draft, ...patch });
    } catch {
      setLog([...next, { role: "assistant" as const, content: "AI offline · use the form directly." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Talk to Kentir">
      <div aria-live="polite">
        {log.map((l, i) => (
          <p key={i}>
            <strong>{l.role === "user" ? "You" : "Kentir"}:</strong> {l.content}
          </p>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <label htmlFor="chat-input">Tell Kentir about your coin</label>
        <textarea id="chat-input" rows={2} maxLength={1000} value={input} onChange={(e) => setInput(e.target.value)} />
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
      <div>
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}
