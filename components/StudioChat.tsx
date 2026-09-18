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
    <section className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#14131b] shadow-2xl max-sm:h-[560px]" aria-label="Talk to Kentir">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#18171f] px-5 py-3.5">
        <div className="text-xs font-bold tracking-[0.08em] text-white uppercase font-mono">
          <span>Kentir Copilot</span>
        </div>
        <span className="text-xs text-white/50">Draft fills as you chat</span>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-5" aria-live="polite" ref={logRef}>
        {log.map((l, i) => (
          <div
            key={i}
            data-role={l.role}
            className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words ${
              l.role === "user"
                ? "self-end bg-[#e4cef7] text-[#17131f] shadow-md font-medium"
                : "self-start border border-white/10 bg-[#1b1924] text-[#f5f3f7]"
            }`}
          >
            <span
              className={`mb-1 block text-[11px] font-bold tracking-[0.06em] uppercase font-mono ${
                l.role === "user" ? "text-[#17131f]/70" : "text-[#b9e2f8]"
              }`}
            >
              {l.role === "user" ? "You" : "Kentir"}
            </span>
            <p className="m-0 leading-relaxed whitespace-pre-wrap">{l.content}</p>
          </div>
        ))}

        {busy && (
          <div className="self-start rounded-lg border border-white/10 bg-[#1b1924] px-4 py-3 text-xs text-white/60">
            <span>Thinking…</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-[#18171f] px-5 py-2.5">
        <span className="text-xs font-semibold tracking-wider text-white/40 uppercase font-mono">
          Suggestions:
        </span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="min-h-9 shrink-0 cursor-pointer rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/80 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2.5 border-t border-white/10 bg-[#14131b] px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2.5">
          <textarea
            id="chat-input"
            rows={2}
            maxLength={1000}
            value={input}
            placeholder="Type your coin idea..."
            className="max-h-[110px] min-h-12 flex-1 resize-none rounded-lg border border-white/15 bg-[#18171f] px-3.5 py-2.5 font-[inherit] text-sm leading-snug text-white placeholder-white/30 focus:border-[#e4cef7] focus:bg-[#1b1924]"
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
            className="inline-flex h-12 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#e4cef7] px-5 text-[13px] font-bold whitespace-nowrap text-[#17131f] transition-all hover:bg-[#f1d2e8] disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
            aria-label="Send message"
          >
            <SendHorizonal size={16} />
            <span>Send</span>
          </button>
        </div>
        <div className="flex items-center justify-between text-xs text-white/40">
          <span>Enter to send · Shift+Enter for new line</span>
          <span>{input.length}/1000</span>
        </div>
      </form>
    </section>
  );
}
