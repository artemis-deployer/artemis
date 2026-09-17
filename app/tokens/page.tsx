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

  useEffect(() => {
    fetch("/api/community/tokens")
      .then((r) => r.json())
      .then((j: { tokens?: Token[] }) => setTokens(Array.isArray(j.tokens) ? j.tokens : []))
      .catch(() => setTokens([]));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync localStorage read once on mount, no subscription to synchronize
    setLocal(listReceipts());
  }, []);

  if (tokens === null) return <main>Loading tokens…</main>;

  return (
    <main>
      <h1>Token showcase</h1>
      {tokens.length === 0 && local.length === 0 && <p>No launches yet. Be the first spark.</p>}
      {tokens.map((t) => (
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
      {tokens.length === 0 &&
        local.map((r, i) => (
          <article key={`${r.hash}:${i}`}>
            <h2>Local launch</h2>
            <p>Chain {String(r.chainId)}</p>
            {r.token && <p>Token: {r.token}</p>}
            <p>Tx: {r.hash}</p>
          </article>
        ))}
    </main>
  );
}
