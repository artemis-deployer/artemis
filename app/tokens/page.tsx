"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Copy, Check, ExternalLink, ArrowLeft, Plus } from "lucide-react";
import { listReceipts, type Receipt } from "../../lib/receipts";
import { getChain } from "../../lib/chains";

type Token = {
  chain_id: string;
  address: string;
  creator: string;
  name: string;
  symbol: string;
  pool: string;
  tx_hash: string;
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [local, setLocal] = useState<Receipt[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "hood" | "solana" | "local">("all");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/community/tokens")
      .then((r) => r.json())
      .then((j: { tokens?: Token[] }) => setTokens(Array.isArray(j.tokens) ? j.tokens : []))
      .catch(() => setTokens([]));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only sync
    setLocal(listReceipts());
  }, []);

  function copyText(text: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  function getExplorerUrl(chainId: string | number, address: string) {
    const c = getChain(chainId);
    const base = c?.explorer ?? (String(chainId).includes("solana") ? "https://solscan.io" : "https://blockscout.com");
    if (String(chainId).includes("solana")) {
      return `${base}/token/${address}`;
    }
    return `${base}/address/${address}`;
  }

  function getTxUrl(chainId: string | number, txHash: string) {
    const c = getChain(chainId);
    const base = c?.explorer ?? (String(chainId).includes("solana") ? "https://solscan.io" : "https://blockscout.com");
    return `${base}/tx/${txHash}`;
  }

  if (tokens === null) {
    return (
      <div className="page-container py-24 text-center">
        <p className="text-base text-[var(--muted)]">Loading community showcase…</p>
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

  // Filter local tokens
  const filteredLocal = local.filter((r) => {
    if (filter === "hood" && !["4663", "46630"].includes(String(r.chainId))) return false;
    if (filter === "solana" && !String(r.chainId).toLowerCase().includes("solana")) return false;
    if (!q) return true;
    return [r.ticker, r.token, r.hash].some((f) => (f ?? "").toLowerCase().includes(q));
  });

  const totalCount = filteredCommunity.length + (filter === "all" || filter === "local" ? filteredLocal.length : 0);

  return (
    <>
      <header className="topbar-wrapper">
        <div className="topbar-container">
          <Link href="/" className="brand-link">
            <span>kentir</span>
            <span className="brand-star" aria-hidden="true">✳</span>
          </Link>
          <nav className="topbar-nav" aria-label="Main Navigation">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold">
              <ArrowLeft size={13} />
              <span>Back to Studio</span>
            </Link>
          </nav>
          <div className="topbar-actions">
            <Link href="/#studio" className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} />
              <span>New Launch</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="page-container pt-8">
        <div className="showcase-header">
          <p className="eyebrow">Onchain Catalog</p>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Token Showcase</h1>
          <p className="text-base text-[var(--muted)] m-0 max-width-[600px]">
            Explore tokens launched across Robinhood Chain direct pools and Solana pump.fun bonding curves.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="showcase-filter-bar">
          <div className="chain-filter-pills">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`filter-pill ${filter === "all" ? "active" : ""}`}
            >
              All Tokens
            </button>
            <button
              type="button"
              onClick={() => setFilter("hood")}
              className={`filter-pill ${filter === "hood" ? "active" : ""}`}
            >
              Robinhood Chain
            </button>
            <button
              type="button"
              onClick={() => setFilter("solana")}
              className={`filter-pill ${filter === "solana" ? "active" : ""}`}
            >
              Solana
            </button>
            <button
              type="button"
              onClick={() => setFilter("local")}
              className={`filter-pill ${filter === "local" ? "active" : ""}`}
            >
              Local Receipts ({local.length})
            </button>
          </div>

          <div className="search-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="search"
              value={query}
              placeholder="Search ticker, name, address…"
              className="search-input"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Count Status */}
        <p role="status" className="text-xs text-[var(--muted)] mb-6 font-mono">
          Showing {totalCount} token{totalCount === 1 ? "" : "s"}
        </p>

        {/* Empty State */}
        {totalCount === 0 && (
          <div className="border border-dashed border-[var(--line)] rounded-xl p-12 text-center my-8 bg-[var(--card)]">
            <h3 className="text-lg font-bold mb-2">No tokens found</h3>
            <p className="text-sm text-[var(--muted)] mb-6">
              {query ? "No tokens match your search query." : "No launches have been registered yet."}
            </p>
            <Link href="/#studio" className="btn-primary">
              Launch Your Coin First ↗
            </Link>
          </div>
        )}

        {/* Community Tokens Grid */}
        <div className="token-grid">
          {filteredCommunity.map((t) => {
            const chainInfo = getChain(t.chain_id);
            return (
              <article key={`${t.chain_id}:${t.address}`} className="token-card">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
                  <div>
                    <h3 className="text-lg font-bold m-0 leading-tight">
                      {t.name || t.symbol || "Untitled Coin"}
                    </h3>
                    <span className="font-mono text-xs font-bold text-[var(--accent)] tracking-wider">
                      ${t.symbol || "TOKEN"}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 border border-[var(--line)] rounded bg-[var(--canvas)] text-[var(--muted)]">
                    {chainInfo?.name ?? `Chain ${t.chain_id}`}
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Contract:</span>
                    <div className="flex items-center gap-1">
                      <a
                        href={getExplorerUrl(t.chain_id, t.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline inline-flex items-center gap-0.5"
                      >
                        <span>{t.address.slice(0, 6)}…{t.address.slice(-4)}</span>
                        <ExternalLink size={11} />
                      </a>
                      <button
                        type="button"
                        onClick={() => copyText(t.address)}
                        className="p-1 hover:bg-[var(--canvas)] rounded text-[var(--muted)]"
                        title="Copy address"
                      >
                        {copied === t.address ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  {t.pool && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Pool:</span>
                      <span className="truncate max-w-[180px]">{t.pool}</span>
                    </div>
                  )}

                  {t.tx_hash && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Tx:</span>
                      <a
                        href={getTxUrl(t.chain_id, t.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline inline-flex items-center gap-0.5"
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
              <article key={`${r.hash}:${i}`} className="token-card border-dashed">
                <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
                  <div>
                    <h3 className="text-lg font-bold m-0 leading-tight">
                      {r.ticker ? `$${r.ticker}` : "Local Launch Receipt"}
                    </h3>
                    <span className="text-xs text-[var(--muted)]">Saved in this browser</span>
                  </div>
                  <span className="text-[11px] font-mono uppercase px-2 py-0.5 border border-[var(--line)] rounded bg-[var(--canvas)] text-[var(--muted)]">
                    Local
                  </span>
                </div>

                <div className="flex flex-col gap-2 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Chain:</span>
                    <span>{String(r.chainId)}</span>
                  </div>

                  {r.token && (
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--muted)]">Token:</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={getExplorerUrl(r.chainId, r.token)}
                          target="_blank"
                          rel="noreferrer"
                          className="underline inline-flex items-center gap-0.5"
                        >
                          <span>{r.token.slice(0, 6)}…{r.token.slice(-4)}</span>
                          <ExternalLink size={11} />
                        </a>
                        <button
                          type="button"
                          onClick={() => copyText(r.token!)}
                          className="p-1 hover:bg-[var(--canvas)] rounded text-[var(--muted)]"
                          title="Copy address"
                        >
                          {copied === r.token ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--muted)]">Tx:</span>
                    <a
                      href={getTxUrl(r.chainId, r.hash)}
                      target="_blank"
                      rel="noreferrer"
                      className="underline inline-flex items-center gap-0.5"
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
    </>
  );
}
