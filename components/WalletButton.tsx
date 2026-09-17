"use client";

import { useState } from "react";
import type { Address } from "viem";
import { connectWallet, ensureChain } from "../lib/launcher-evm";

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton({ chainId }: { chainId: 4663 | 46630 }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function connect() {
    setError("");
    setLoading(true);
    try {
      await ensureChain(chainId);
      setAccount(await connectWallet());
    } catch {
      setError("Wallet connection failed. Please ensure your Ethereum wallet is unlocked.");
    } finally {
      setLoading(false);
    }
  }

  if (!account) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => void connect()}
          disabled={loading}
          className="btn-secondary w-full justify-center"
        >
          <span>{loading ? "Connecting…" : "Connect Ethereum Wallet"}</span>
        </button>
        {error && (
          <p role="alert" className="text-xs text-[var(--accent)] font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 bg-[var(--canvas)] border border-[var(--line)] text-[var(--ink)] px-3 py-1.5 rounded text-xs font-semibold">
      <span>Connected: {short(account)}</span>
    </div>
  );
}
