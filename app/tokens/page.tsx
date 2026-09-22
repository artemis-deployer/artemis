"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Copy, Check, ExternalLink, X, Globe } from "lucide-react";
import { TransitionLink } from "../../components/PageTransition";
import { dedupeLocalReceipts, listReceipts, type Receipt } from "../../lib/receipts";
import { displayArtworkUrl } from "../../lib/showcase";
import { explorerTokenUrl, explorerTxUrl, getChain } from "../../lib/chains";

type Token = {
  chain_id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  tx_hash: string;
  image?: string;
  tagline?: string;
  description?: string;
  lore?: string;
  marketingHook?: string;
  marketing_hook?: string;
  xUrl?: string;
  x_url?: string;
  webUrl?: string;
  web_url?: string;
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [local, setLocal] = useState<Receipt[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "hood" | "solana" | "local">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loreModal, setLoreModal] = useState<Token | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tokenKey(t: Pick<Token, "chain_id" | "address">) {
    return `${t.chain_id}:${t.address}`;
  }

  function toggleExpanded(t: Pick<Token, "chain_id" | "address">) {
    const k = tokenKey(t);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }

  function storyHook(t: Token) {
    return t.marketingHook ?? t.marketing_hook ?? "";
  }

  /** DB rows use snake_case; https-only, attacker links never render. */
  function tokenLink(t: Token, key: "x" | "web"): string {
    const raw = key === "x" ? (t.xUrl ?? t.x_url ?? "") : (t.webUrl ?? t.web_url ?? "");
    return typeof raw === "string" && raw.startsWith("https://") ? raw : "";
  }

  useEffect(() => {
    if (!loreModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLoreModal(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loreModal]);

  useEffect(() => {
    let alive = true;
    fetch("/api/community/tokens")
      .then((r) => r.json())
      .then((j: { tokens?: Token[] }) => {
        if (alive) setTokens(Array.isArray(j.tokens) ? j.tokens : []);
      })
      .catch(() => {
        if (alive) setTokens([]);
      });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only sync
    setLocal(listReceipts());
    return () => {
      alive = false;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  function copyText(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(text);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(null), 2000);
    }
  }

  function getExplorerUrl(chainId: string | number, address: string) {
    return explorerTokenUrl(chainId, address);
  }

  function getTxUrl(chainId: string | number, txHash: string) {
    return explorerTxUrl(chainId, txHash);
  }

  if (tokens === null) {
    return (
      <div className="min-h-screen bg-[#131416] text-[#f8f6f0] flex items-center justify-center">
        <p className="text-base text-white/50 font-mono">Loading community showcase…</p>
      </div>
    );
  }

  const q = query.trim().toLowerCase();

  // Filter community tokens
  const filteredCommunity = tokens.filter((t) => {
    if (filter === "hood" && !["4663", "46630"].includes(String(t.chain_id))) return false;
    if (filter === "solana" && !String(t.chain_id).toLowerCase().includes("solana")) return false;
    if (filter === "local") return false;
    if (!q) return true;
    return [t.name, t.symbol, t.address, t.tx_hash, t.tagline, t.description, t.lore, storyHook(t)].some((f) =>
      (f ?? "").toLowerCase().includes(q),
    );
  });

  // Filter local tokens, preferring DB row when same token exists remotely
  const filteredLocal = dedupeLocalReceipts(
    local.filter((r) => {
      if (filter === "hood" && !["4663", "46630"].includes(String(r.chainId))) return false;
      if (filter === "solana" && !String(r.chainId).toLowerCase().includes("solana")) return false;
      if (!q) return true;
      return [r.ticker, r.token, r.hash].some((f) => (f ?? "").toLowerCase().includes(q));
    }),
    tokens ?? [],
  );

  const totalCount = filteredCommunity.length + (filter === "all" || filter === "local" ? filteredLocal.length : 0);

  return (
    <div className="min-h-screen bg-[#131416] text-[#f8f6f0] font-sans">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131416]/90 backdrop-blur-md">
        <div className="mx-auto flex min-h-[80px] max-w-[1800px] items-center justify-between gap-4 px-[max(6.25vw,24px)]">
          <TransitionLink href="/" className="flex items-center no-underline text-inherit" aria-label="Artemis home">
            <img src="/assets/logo.webp" className="h-7 w-auto object-contain" alt="Artemis" />
          </TransitionLink>

          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <TransitionLink href="/" className="dp-button secondary min-w-0 text-xs py-1" aria-label="Back to Studio">
              <span>BACK TO STUDIO</span>
              <span className="arrow-box">↖</span>
            </TransitionLink>
            <TransitionLink
              href="/#studio"
              className="dp-button min-w-0 text-xs py-1"
            >
              <span>NEW LAUNCH</span>
              <span className="arrow-box">↘</span>
            </TransitionLink>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] px-[max(6.25vw,24px)] pt-12 pb-24">
        <div className="mb-10 border-b border-white/10 pb-8">
          <p className="m-0 mb-2 text-xs font-mono uppercase tracking-[0.2em] text-[#fae8a4]">ONCHAIN CATALOG</p>
          <h1 className="font-unbounded m-0 mb-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
            Token Showcase
          </h1>
          <p className="m-0 max-w-xl text-base text-white/70 leading-relaxed">
            Explore tokens launched across Robinhood Chain direct Uniswap V2 pools and Solana pump.fun bonding curves.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All Tokens"],
                ["hood", "Robinhood Chain"],
                ["solana", "Solana"],
                ["local", `Local Receipts (${local.length})`],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter(v)}
                className={`min-h-10 cursor-pointer rounded px-4 py-2 text-xs font-semibold transition-all border ${
                  filter === v
                    ? "border-[#fae8a4] bg-[#fae8a4] text-[#18191c] shadow-md"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-[320px]">
            <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              value={query}
              placeholder="Search ticker, name, address…"
              className="w-full rounded-lg border border-white/15 bg-[#1a1b1f] py-2.5 pr-3.5 pl-9 text-xs text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#202126]"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Count Status */}
        <p role="status" className="mb-6 font-mono text-xs text-white/50">
          Showing {totalCount} token{totalCount === 1 ? "" : "s"}
        </p>

        {/* Empty State */}
        {totalCount === 0 && (
          <div className="my-12 rounded-xl border border-dashed border-white/15 bg-[#1a1b1f] p-12 text-center">
            <h3 className="mb-2 font-unbounded text-xl font-bold text-white">No tokens found</h3>
            <p className="mb-6 text-sm text-white/60">
              {query ? "No tokens match your search query." : "No launches have been registered yet."}
            </p>
            <Link
              href="/#studio"
              className="dp-button"
            >
              <span>LAUNCH YOUR COIN FIRST</span>
              <span className="arrow-box">↘</span>
            </Link>
          </div>
        )}

        {/* Community Tokens Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredCommunity.map((t) => {
            const chainInfo = getChain(t.chain_id);
            return (
              <article
                key={`${t.chain_id}:${t.address}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-[#1a1b1f] p-6 shadow-xl hover:border-white/25 transition-all"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {(() => {
                      const art = displayArtworkUrl(t.image);
                      return art ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- user-supplied https token artwork */
                        <img
                          src={art}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-full border border-white/15 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 font-unbounded text-sm font-bold text-white/50"
                        >
                          {(t.symbol || t.name || "T").slice(0, 1).toUpperCase()}
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                    <h3
                      title={t.name || t.symbol || "Untitled Coin"}
                      className="m-0 truncate text-sm leading-snug font-bold text-white"
                    >
                      {t.name || t.symbol || "Untitled Coin"}
                    </h3>
                    <span className="font-mono text-xs font-bold tracking-wider text-[#fae8a4]">
                      ${t.symbol || "TOKEN"}
                    </span>
                    {typeof t.tagline === "string" && t.tagline !== "" && (
                      <span className="mt-0.5 block text-xs text-white/70 italic">{t.tagline}</span>
                    )}
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-white/70 uppercase">
                    {chainInfo?.name ?? `Chain ${t.chain_id}`}
                  </span>
                </div>

                {(storyHook(t) !== "" ||
                  (typeof t.description === "string" && t.description !== "") ||
                  (typeof t.lore === "string" && t.lore !== "")) && (
                  <div className="flex flex-col gap-1.5 border-b border-white/10 pb-3 text-left">
                    {storyHook(t) !== "" && (
                      <p className="m-0 border-l-2 border-[#fae8a4]/60 pl-2 text-xs leading-relaxed text-white/85">
                        {storyHook(t)}
                      </p>
                    )}
                    {typeof t.description === "string" && t.description !== "" && (
                      <div>
                        <p
                          className={`m-0 text-xs leading-relaxed text-white/60 ${expanded.has(tokenKey(t)) ? "" : "line-clamp-2"}`}
                        >
                          {t.description}
                        </p>
                        {t.description.length > 140 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(t)}
                            aria-expanded={expanded.has(tokenKey(t))}
                            className="mt-0.5 cursor-pointer p-0 text-[11px] font-semibold text-[#cadcf0] hover:text-white"
                          >
                            {expanded.has(tokenKey(t)) ? "Show less" : "Read more"}
                          </button>
                        )}
                      </div>
                    )}
                    {typeof t.lore === "string" && t.lore !== "" && (
                      <div>
                        <p className="m-0 line-clamp-2 text-xs leading-relaxed text-white/50">{t.lore}</p>
                        <button
                          type="button"
                          onClick={() => setLoreModal(t)}
                          className="mt-0.5 cursor-pointer p-0 text-[11px] font-semibold text-[#cadcf0] hover:text-white"
                        >
                          View lore
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {(tokenLink(t, "x") !== "" || tokenLink(t, "web") !== "") && (
                  <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                    {tokenLink(t, "x") !== "" && (
                      <a
                        href={tokenLink(t, "x")}
                        target="_blank"
                        rel="noreferrer"
                        title="X / Twitter"
                        aria-label={`${t.symbol || "Token"} on X`}
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-white/70 transition-all hover:border-white/30 hover:text-white"
                      >
                        <span className="text-[13px] leading-none font-bold" aria-hidden="true">X</span>
                      </a>
                    )}
                    {tokenLink(t, "web") !== "" && (
                      <a
                        href={tokenLink(t, "web")}
                        target="_blank"
                        rel="noreferrer"
                        title="Website"
                        aria-label={`${t.symbol || "Token"} website`}
                        className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 p-2 text-white/70 transition-all hover:border-white/30 hover:text-white"
                      >
                        <Globe size={13} aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}

                <dl className="divide-y divide-white/5 text-left font-mono text-xs">
                  <div className="flex items-start gap-3 py-2.5">
                    <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                      Contract
                    </dt>
                    <dd className="flex min-w-0 flex-1 items-start gap-1.5">
                      <a
                        href={getExplorerUrl(t.chain_id, t.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 text-[11px] leading-relaxed text-[#cadcf0] hover:text-white [overflow-wrap:anywhere]"
                      >
                        {t.address}
                      </a>
                      <span className="-mt-1 flex shrink-0 items-center">
                        <a
                          href={getExplorerUrl(t.chain_id, t.address)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                          title="View on explorer"
                        >
                          <ExternalLink size={12} />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(t.address)}
                          className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white cursor-pointer"
                          title="Copy address"
                        >
                          {copied === t.address ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </span>
                    </dd>
                  </div>

                  {t.pool && (
                    <div className="flex items-start gap-3 py-2.5">
                      <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                        Pool
                      </dt>
                      <dd className="min-w-0 flex-1 text-[11px] leading-relaxed text-white/75 [overflow-wrap:anywhere]">
                        {t.pool}
                      </dd>
                    </div>
                  )}

                  {t.tx_hash && (
                    <div className="flex items-start gap-3 py-2.5">
                      <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                        Tx
                      </dt>
                      <dd className="flex min-w-0 flex-1 items-start gap-1.5">
                        <a
                          href={getTxUrl(t.chain_id, t.tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 text-[11px] leading-relaxed text-[#cadcf0] hover:text-white [overflow-wrap:anywhere]"
                        >
                          {t.tx_hash}
                        </a>
                        <a
                          href={getTxUrl(t.chain_id, t.tx_hash)}
                          target="_blank"
                          rel="noreferrer"
                          className="-mt-1 shrink-0 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                          title="View tx on explorer"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            );
          })}

          {/* Local Tokens Grid */}
          {(filter === "all" || filter === "local") &&
            filteredLocal.map((r, i) => (
              <article
                key={`${r.hash}:${i}`}
                className="flex h-full flex-col gap-3 rounded-xl border border-dashed border-white/20 bg-[#1a1b1f] p-6 shadow-xl hover:border-white/35 transition-all"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {(() => {
                      const art = displayArtworkUrl(r.image);
                      return art ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- user-supplied https token artwork */
                        <img
                          src={art}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-full border border-white/15 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span
                          aria-hidden="true"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 font-unbounded text-sm font-bold text-white/50"
                        >
                          {(r.ticker || "L").slice(0, 1).toUpperCase()}
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <h3
                        title={r.ticker ? `$${r.ticker}` : "Local Launch Receipt"}
                        className="m-0 truncate text-sm leading-snug font-bold text-white"
                      >
                        {r.ticker ? `$${r.ticker}` : "Local Launch Receipt"}
                      </h3>
                      <span className="text-xs text-white/50">Saved in this browser</span>
                    </div>
                  </div>
                  <span className="shrink-0 self-start rounded border border-[#cadcf0]/30 bg-[#cadcf0]/10 px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-[#cadcf0] uppercase">
                    Local
                  </span>
                </div>

                <dl className="divide-y divide-white/5 text-left font-mono text-xs">
                  <div className="flex items-center justify-between gap-2 py-2">
                    <dt className="shrink-0 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                      Chain
                    </dt>
                    <dd className="truncate text-white/80">{getChain(r.chainId)?.name ?? String(r.chainId)}</dd>
                  </div>

                  {r.token && (
                    <div className="flex items-start gap-3 py-2.5">
                      <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                        Token
                      </dt>
                      <dd className="flex min-w-0 flex-1 items-start gap-1.5">
                        <a
                          href={getExplorerUrl(r.chainId, r.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 text-[11px] leading-relaxed text-[#cadcf0] hover:text-white [overflow-wrap:anywhere]"
                        >
                          {r.token}
                        </a>
                        <span className="-mt-1 flex shrink-0 items-center">
                          <a
                            href={getExplorerUrl(r.chainId, r.token)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                            title="View on explorer"
                          >
                            <ExternalLink size={12} />
                          </a>
                          <button
                            type="button"
                            onClick={() => copyText(r.token!)}
                            className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white cursor-pointer"
                            title="Copy address"
                          >
                            {copied === r.token ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          </button>
                        </span>
                      </dd>
                    </div>
                  )}

                  <div className="flex items-start gap-3 py-2.5">
                    <dt className="w-14 shrink-0 pt-0.5 text-[10px] font-semibold tracking-[0.14em] text-white/40 uppercase">
                      Tx
                    </dt>
                    <dd className="flex min-w-0 flex-1 items-start gap-1.5">
                      <a
                        href={getTxUrl(r.chainId, r.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 text-[11px] leading-relaxed text-[#cadcf0] hover:text-white [overflow-wrap:anywhere]"
                      >
                        {r.hash}
                      </a>
                      <a
                        href={getTxUrl(r.chainId, r.hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="-mt-1 shrink-0 rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                        title="View tx on explorer"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
        </div>
      </main>

      {loreModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLoreModal(null)}
          role="presentation"
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/15 bg-[#1a1b1f] p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`${loreModal.name || loreModal.symbol || "Token"} lore`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="m-0 truncate text-sm font-bold text-white">
                  {loreModal.name || loreModal.symbol || "Untitled Coin"}
                </h3>
                <p className="m-0 font-mono text-xs font-bold tracking-wider text-[#fae8a4]">
                  ${loreModal.symbol || "TOKEN"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoreModal(null)}
                autoFocus
                className="shrink-0 cursor-pointer rounded p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                aria-label="Close lore"
              >
                <X size={16} />
              </button>
            </div>
            {typeof loreModal.tagline === "string" && loreModal.tagline !== "" && (
              <p className="mt-0 mb-3 text-xs text-white/70 italic">{loreModal.tagline}</p>
            )}
            {(loreModal.lore ?? "").split(/\n\n+/).map((para, i) => (
              <p key={i} className="mt-0 mb-3 text-sm leading-relaxed text-white/80 last:mb-0">
                {para}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
