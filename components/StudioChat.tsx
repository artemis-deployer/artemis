"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { Check, ChevronDown, RotateCcw, SendHorizonal, Sparkles } from "lucide-react";
import { parseDraftReply, resolveAutoPatch } from "../lib/draft";
import type { Draft } from "../lib/draft";
import { CHAINS, defaultRouteFor, getChain } from "../lib/chains";
import { useDraft } from "./DraftContext";
import ChainLogo from "./ChainLogo";

type Line = { role: "user" | "assistant"; content: string; kind?: "ok" | "error"; auto?: boolean };

const SUGGESTIONS = [
  "Community coin for a local arts club",
  "Gaming token called RAID on Robinhood Chain",
  "Simple launch: 500M tokens with 0.5 liquidity",
];

const OFFLINE_LINE = "AI offline · configure parameters in the form directly.";
const LIMIT_LINE = "Message exceeds character limit or could not be processed. Try again with a shorter prompt.";
const GREETING = "Tell me about your coin idea or community, and I'll draft the launch parameters for you.";

/** Hide the machine-readable JSON draft block; humans read the prose. */
function displayOf(reply: string, patched: boolean): string {
  const stripped = reply
    .replace(/```json\s*[\s\S]*?```/g, "")
    .replace(/\{[^{}]*"ticker"[^{}]*\}\s*$/, "")
    .trim();
  if (stripped) return stripped;
  return patched ? "Draft updated from your idea — review it in Manual Parameters." : reply;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const TYPE_STEP = 14;
const TYPE_MS = 12;

export default function StudioChat() {
  const { draft, setDraft, setConsent } = useDraft();
  const [log, setLog] = useState<Line[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<{ i: number; n: number } | null>(null);
  const [undo, setUndo] = useState<{ snapshot: Draft } | null>(null);
  const [chainOpen, setChainOpen] = useState(false);
  const chainRef = useRef<HTMLDivElement>(null);
  const activeChain = getChain(draft.chainId);
  const [prevChainId, setPrevChainId] = useState(draft.chainId);
  if (draft.chainId !== prevChainId) {
    setPrevChainId(draft.chainId);
    if (chainOpen) setChainOpen(false);
  }

  useEffect(() => {
    if (!chainOpen) return;
    function onDown(e: MouseEvent) {
      if (chainRef.current && !chainRef.current.contains(e.target as Node)) setChainOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setChainOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [chainOpen]);

  function pickChain(id: number | string) {
    setDraft((prev) => ({ ...prev, chainId: id, route: defaultRouteFor(id) }));
    setConsent(false);
    setUndo(null);
    setChainOpen(false);
  }
  const logRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const draftRef = useRef(draft);
  // Same-tick guard: `busy` state flips only after re-render, so rapid
  // double-clicks see stale `busy=false` + stale `log` and double-POST.
  const busyRef = useRef(false);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log, busy, reveal]);

  useEffect(() => {
    if (!reveal) return;
    const id = setTimeout(() => {
      setReveal((r) => {
        if (!r) return r;
        const full = log[r.i]?.content ?? "";
        return r.n >= full.length ? null : { i: r.i, n: r.n + TYPE_STEP };
      });
    }, TYPE_MS);
    return () => clearTimeout(id);
  }, [reveal, log]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.overflowY = "hidden";
    el.style.height = `${Math.min(el.scrollHeight, 110)}px`;
    if (el.scrollHeight > 110) el.style.overflowY = "auto";
  }, [input]);

  function reset() {
    if (busy || busyRef.current) return;
    setReveal(null);
    setLog([{ role: "assistant", content: GREETING }]);
    setInput("");
    setUndo(null);
  }

  function undoAuto() {
    if (!undo) return;
    const snapshot = undo.snapshot;
    setDraft(() => snapshot);
    setUndo(null);
  }

  async function send(text: string) {
    const content = text.trim().slice(0, 1000);
    if (!content || busy || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const snapshot = draftRef.current;
    const next: Line[] = [...log, { role: "user" as const, content }];
    setLog(next);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: next.map(({ role, content: c }) => ({ role, content: c })),
          draft: snapshot,
        }),
      });

      if (res.status === 400) {
        setLog([...next, { role: "assistant" as const, content: LIMIT_LINE, kind: "error" }]);
        return;
      }

      const json = (await res.json().catch(() => null)) as {
        reply?: unknown;
        error?: unknown;
        draft?: Partial<Draft> | null;
        draftErrors?: unknown;
      } | null;
      const safe = json && typeof json === "object" ? json : {};
      const reply = typeof safe.reply === "string" && safe.reply ? safe.reply : OFFLINE_LINE;
      const serverDraft = safe.draft && typeof safe.draft === "object" ? safe.draft : null;
      const draftErrors = Array.isArray(safe.draftErrors) ? (safe.draftErrors as string[]) : [];
      const hasValueError = draftErrors.some((e) => e !== "missing-json-block" && e !== "invalid-json");
      let patch: Partial<Draft>;
      if (serverDraft && Object.keys(serverDraft).length > 0) {
        patch = serverDraft;
      } else if (hasValueError && reply !== OFFLINE_LINE) {
        patch = {};
      } else {
        patch = parseDraftReply(reply);
      }
      const latest = draftRef.current;
      const activeId =
        typeof document !== "undefined" ? (document.activeElement as HTMLElement | null)?.id ?? null : null;
      const resolved = resolveAutoPatch(latest, patch, activeId);
      const auto = resolved !== null;
      if (resolved) {
        const nextDraft = resolved.next;
        const nextChainId = resolved.next.chainId;
        // Functional update: response may land after user typed in Manual
        // Parameters; updater form avoids clobbering on stale `latest`.
        // ponytail: patch already merged over ref-fresh latest, updater only
        // guards the commit, no re-merge inside (StrictMode-impure otherwise).
        setDraft(() => nextDraft);
        // Manual chain picks reset consent; AI chain changes must too,
        // else mainnet consent carries across chains (consent bypass).
        if (nextChainId !== latest.chainId) setConsent(false);
        setUndo({ snapshot: resolved.prevSnapshot });
      }
      const shown = displayOf(reply, auto);
      const at = next.length;
      setLog([...next, { role: "assistant" as const, content: shown, kind: reply === OFFLINE_LINE ? "error" : "ok", auto }]);
      if (!prefersReducedMotion()) setReveal({ i: at, n: 0 });
    } catch {
      setLog([...next, { role: "assistant" as const, content: OFFLINE_LINE, kind: "error" }]);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function visible(l: Line, i: number): string {
    if (l.role !== "assistant" || !reveal || reveal.i !== i) return l.content;
    return l.content.slice(0, reveal.n);
  }

  return (
    <section className="flex h-[640px] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#131416] shadow-2xl max-sm:h-[560px]" aria-label="Talk to Artemis">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#1a1b1f] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fae8a4] font-unbounded text-sm text-[#18191c]" aria-hidden="true">
            K
          </span>
          <div className="flex flex-col">
            <span className="font-mono text-xs font-bold tracking-[0.08em] text-white uppercase">
              Artemis Copilot
            </span>
            <span className="text-[11px] text-white/50">Apply suggestions to your draft</span>
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          disabled={busy || log.length <= 1}
          title="Clear chat"
          aria-label="Clear chat"
          className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="relative border-t border-white/10 bg-[#1a1b1f] px-5 py-2.5" ref={chainRef}>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold tracking-wider text-white/40 uppercase">
            Chain:
          </span>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={chainOpen}
            aria-label="Choose chain"
            className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/80 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => setChainOpen((o) => !o)}
          >
            {activeChain && (
              <span className="inline-flex text-[#fae8a4]" aria-hidden="true">
                <ChainLogo kind={activeChain.logo} />
              </span>
            )}
            <span>{activeChain?.name ?? "Choose chain"}</span>
            <ChevronDown
              size={13}
              aria-hidden="true"
              className={`text-white/50 transition-transform duration-150 ${chainOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>
        {chainOpen && (
          <ul
            role="listbox"
            aria-label="Chains"
            className="drop-in absolute right-5 left-5 z-20 mt-1.5 overflow-hidden rounded-lg border border-white/15 bg-[#1a1b1f] shadow-2xl"
          >
            {CHAINS.map((c) => {
              const active = draft.chainId === c.id;
              return (
                <li key={String(c.id)} role="option" aria-selected={active}>
                  <button
                    type="button"
                    disabled={c.disabled}
                    onClick={() => pickChain(c.id)}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="inline-flex shrink-0 text-[#fae8a4]" aria-hidden="true">
                      <ChainLogo kind={c.logo} />
                    </span>
                    <span className="flex-1">{c.name}</span>
                    {c.disabled ? (
                      <span className="font-mono text-[10px] text-white/40">Soon</span>
                    ) : (
                      <span className="font-mono text-[10px] text-white/40">{c.testnet ? "Test" : "Live"}</span>
                    )}
                    {active && <Check size={13} aria-hidden="true" className="text-[#fae8a4]" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="chat-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto p-5" aria-live="polite" ref={logRef}>
        {log.map((l, i) => (
          <div
            key={i}
            data-role={l.role}
            className={`max-w-[86%] rounded-lg px-4 py-3 text-sm leading-relaxed break-words ${
              l.role === "user"
                ? "self-end bg-[#fae8a4] font-medium text-[#18191c] shadow-md"
                : l.kind === "error"
                  ? "self-start border border-amber-300/30 bg-amber-300/10 text-[#f8f6f0]"
                  : "self-start border border-white/10 bg-[#1a1b1f] text-[#f8f6f0]"
            }`}
          >
            <span
              className={`mb-1 block font-mono text-[11px] font-bold tracking-[0.06em] uppercase ${
                l.role === "user" ? "text-[#18191c]/70" : "text-[#cadcf0]"
              }`}
            >
              {l.role === "user" ? "You" : "Artemis"}
            </span>
            {l.role === "assistant" ? (
              <div className="md-body">
                <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{visible(l, i)}</Markdown>
              </div>
            ) : (
              <p className="m-0 leading-relaxed whitespace-pre-wrap">{l.content}</p>
            )}
            {l.auto && (!reveal || reveal.i !== i) && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                <Sparkles size={11} aria-hidden="true" /> AI updated
                {undo && (
                  <>
                    <span aria-hidden="true"> • </span>
                    <button type="button" onClick={undoAuto} className="cursor-pointer underline">
                      Undo
                    </button>
                  </>
                )}
              </span>
            )}
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-[#1a1b1f] px-4 py-3" aria-label="Artemis is thinking">
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60"
                style={{ animationDelay: `${d * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="chat-scroll flex items-center gap-2 overflow-x-auto border-t border-white/10 bg-[#1a1b1f] px-5 py-2.5">
        <span className="font-mono text-xs font-semibold tracking-wider text-white/40 uppercase">
          Suggestions:
        </span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-white/80 transition-all hover:border-white/30 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={busy}
            onClick={() => void send(s)}
          >
            <Sparkles size={12} className="text-[#fae8a4]" aria-hidden="true" />
            {s}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-2.5 border-t border-white/10 bg-[#131416] px-5 py-4"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <div className="flex items-end gap-2.5">
          <div className="flex min-h-11 flex-1 items-center gap-2 rounded-lg border border-white/15 bg-[#1a1b1f] px-3.5 transition-colors focus-within:border-[#fae8a4] focus-within:bg-[#202126]">
          <textarea
            id="chat-input"
            ref={areaRef}
            rows={1}
            maxLength={1000}
            value={input}
            placeholder="Type your coin idea..."
            aria-label="Type your coin idea"
            autoComplete="off"
            style={{ outline: "none", boxShadow: "none" }}
            className="max-h-[110px] w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent py-[9px] font-[inherit] text-sm leading-snug text-white placeholder-white/30"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
          />
          </div>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            title="Send (Enter)"
            className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 self-end rounded-lg bg-[#fae8a4] px-5 text-[13px] font-bold whitespace-nowrap text-[#18191c] transition-all hover:bg-[#ece4d4] disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30"
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
