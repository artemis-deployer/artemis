"use client";

import { useState } from "react";

export type SolanaProvider = {
  publicKey: { toBase58(): string };
  connect(): Promise<unknown>;
  signTransaction: <T>(tx: T) => Promise<T>;
};

function pickProvider(): SolanaProvider | null {
  const w = window as unknown as {
    phantom?: { solana?: SolanaProvider };
    solflare?: SolanaProvider;
    solana?: SolanaProvider;
  };
  const p = w.phantom?.solana ?? w.solflare ?? w.solana;
  return p && typeof p.connect === "function" ? p : null;
}

export function getSolanaProvider(): SolanaProvider | null {
  return pickProvider();
}

export default function SolanaButton({ onConnect }: { onConnect: (p: SolanaProvider) => void }) {
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function connect() {
    setError("");
    setLoading(true);
    const p = pickProvider();
    if (!p) {
      setError("Please install Phantom or Solflare wallet extension first.");
      setLoading(false);
      return;
    }
    try {
      await p.connect();
      const b58 = p.publicKey.toBase58();
      setAccount(b58);
      onConnect(p);
    } catch {
      setError("Wallet connection rejected.");
    } finally {
      setLoading(false);
    }
  }

  if (account) {
    return (
      <div className="inline-flex items-center gap-2 bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] px-3 py-1.5 rounded text-xs font-semibold">
        <span>Connected: {account.slice(0, 4)}…{account.slice(-4)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void connect()}
        disabled={loading}
        className="btn-secondary w-full justify-center"
      >
        <span>{loading ? "Connecting Solana…" : "Connect Solana Wallet"}</span>
      </button>
      {error && (
        <p role="alert" className="text-xs text-[var(--accent)] font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
