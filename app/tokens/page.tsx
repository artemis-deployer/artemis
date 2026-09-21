"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, Copy, Check, ExternalLink, ArrowLeft } from "lucide-react";
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
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [local, setLocal] = useState<Receipt[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "hood" | "solana" | "local">("all");
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    return [t.name, t.symbol, t.address, t.tx_hash].some((f) => (f ?? "").toLowerCase().includes(q));
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
          <TransitionLink href="/" className="flex items-center gap-3 no-underline text-inherit">
            <img src="/assets/logo.png" className="w-8 h-8 rounded-full object-cover" alt="" />
            <span className="font-unbounded text-xl font-bold tracking-tight">artemis</span>
          </TransitionLink>

          <nav className="flex items-center gap-1" aria-label="Main Navigation">
            <TransitionLink
              href="/"
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold tracking-wider text-white/70 uppercase no-underline transition-colors hover:text-white hover:bg-white/5 border border-white/15"
            >
              <ArrowLeft size={13} />
              <span>Back to Studio</span>
            </TransitionLink>
          </nav>

          <div className="flex items-center gap-3">
            <TransitionLink
              href="/#studio"
              className="dp-button text-xs py-1"
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(320px,100%),1fr))] gap-5">
          {filteredCommunity.map((t) => {
            const chainInfo = getChain(t.chain_id);
            return (
              <article
                key={`${t.chain_id}:${t.address}`}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-[#1a1b1f] p-6 shadow-xl hover:border-white/25 transition-all"
              >
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const art = displayArtworkUrl(t.image);
                      return art ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- user-supplied https token artwork */
                        <img
                          src={art}
                          alt=""
                          aria-hidden="true"
                          className="h-10 w-10 shrink-0 rounded-full border border-white/15 object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : null;
                    })()}
                    <div>
                      <h3 className="m-0 text-base font-bold text-white">
                        {t.name || t.symbol || "Untitled Coin"}
                      </h3>
                      <span className="font-mono text-xs font-bold tracking-wider text-[#fae8a4]">
                        ${t.symbol || "TOKEN"}
                      </span>
                    </div>
                  </div>
                  <span className="rounded border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-white/70 uppercase">
                    {chainInfo?.name ?? `Chain ${t.chain_id}`}
                  </span>
                </div>

                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Contract:</span>
                    <div className="flex items-center gap-1.5">
                      <a
                        href={getExplorerUrl(t.chain_id, t.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#cadcf0] underline hover:text-white"
                      >
                        <span>{t.address.slice(0, 6)}…{t.address.slice(-4)}</span>
                        <ExternalLink size={11} />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyText(t.address)}
                        className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
                        title="Copy address"
                      >
                        {copied === t.address ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {t.pool && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Pool:</span>
                      <span className="max-w-[180px] truncate text-white/80">{t.pool}</span>
                    </div>
                  )}

                  {t.tx_hash && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Tx:</span>
                      <a
                        href={getTxUrl(t.chain_id, t.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[#cadcf0] underline hover:text-white"
                      >
                        <span>{t.tx_hash.slice(0, 8)}…</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {/* Local Tokens Grid */}
          {(filter === "all" || filter === "local") &&
            filteredLocal.map((r, i) => (
              <article
                key={`${r.hash}:${i}`}
                className="flex flex-col gap-3 rounded-xl border border-dashed border-white/20 bg-[#1a1b1f] p-6 shadow-xl hover:border-white/35 transition-all"
              >
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
                  <div>
                    <h3 className="m-0 text-base font-bold text-white">
                      {r.ticker ? `$${r.ticker}` : "Local Launch Receipt"}
                    </h3>
                    <span className="text-xs text-white/50">Saved in this browser</span>
                  </div>
                  <span className="rounded border border-[#cadcf0]/30 bg-[#cadcf0]/10 px-2 py-0.5 font-mono text-[10px] text-[#cadcf0] uppercase">
                    Local
                  </span>
                </div>

                <div className="flex flex-col gap-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Chain:</span>
                    <span className="text-white/80">{String(r.chainId)}</span>
                  </div>

                  {r.token && (
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Token:</span>
                      <div className="flex items-center gap-1.5">
                        <a
                          href={getExplorerUrl(r.chainId, r.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#cadcf0] underline hover:text-white"
                        >
                          <span>{r.token.slice(0, 6)}…{r.token.slice(-4)}</span>
                          <ExternalLink size={11} />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(r.token!)}
                          className="rounded p-1 text-white/50 hover:bg-white/10 hover:text-white cursor-pointer"
                          title="Copy address"
                        >
                          {copied === r.token ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Tx:</span>
                    <a
                      href={getTxUrl(r.chainId, r.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[#cadcf0] underline hover:text-white"
                    >
                      <span>{r.hash.slice(0, 8)}…</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              </article>
            ))}
        </div>
      </main>
    </div>
  );
}
