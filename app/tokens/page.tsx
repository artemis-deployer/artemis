"use client";

import { useEffect, useState } from "react";
import { listReceipts, type Receipt } from "../../lib/receipts";

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

  useEffect(() => {
    fetch("/api/community/tokens")
      .then((r) => r.json())
      .then((j: { tokens?: Token[] }) => setTokens(Array.isArray(j.tokens) ? j.tokens : []))
      .catch(() => setTokens([]));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync localStorage read once on mount, no subscription to synchronize
    setLocal(listReceipts());
  }, []);

  if (tokens === null) return <main>Loading tokens…</main>;

  const q = query.trim().toLowerCase();
  const shown = q
    ? tokens.filter((t) =>
        [t.name, t.symbol, t.address].some((f) => (f ?? "").toLowerCase().includes(q)),
      )
    : tokens;

  return (
    <main>
      <p className="eyebrow">The Kentir showcase</p>
      <h1>Token showcase</h1>
      <label className="search">
        Search name, ticker, or address
        <input
          type="search"
          value={query}
          placeholder="Search name, ticker, or address"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <p role="status">
        {shown.length} launch{shown.length === 1 ? "" : "es"}
      </p>
      {tokens.length === 0 && local.length === 0 && <p>No launches yet. Be the first spark.</p>}
      {shown.map((t) => (
        <article key={`${t.chain_id}:${t.address}`}>
          <h2>
            {t.name || t.symbol || (t.address ?? "").slice(0, 10)}
          </h2>
          <p>
            {t.symbol} · chain {t.chain_id}
          </p>
          <p>Token: {t.address}</p>
          {t.pool && <p>Pool: {t.pool}</p>}
          {t.tx_hash && <p>Tx: {t.tx_hash}</p>}
        </article>
      ))}
      {local.length > 0 && (
        <>
          <h2>Local launches</h2>
          {local.map((r, i) => (
            <article key={`${r.hash}:${i}`}>
              <h2>Local launch</h2>
              <p>Chain {String(r.chainId)}</p>
              {r.token && <p>Token: {r.token}</p>}
              <p>Tx: {r.hash}</p>
            </article>
          ))}
        </>
      )}
    </main>
  );
}
