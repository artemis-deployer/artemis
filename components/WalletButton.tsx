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

  async function connect() {
    setError("");
    try {
      await ensureChain(chainId);
      setAccount(await connectWallet());
    } catch {
      setError("Wallet connection failed. Open this page in an Ethereum wallet browser.");
    }
  }

  if (!account) {
    return (
      <div>
        <button type="button" onClick={() => void connect()}>
          Connect wallet
        </button>
        {error && (
          <p role="alert">{error}</p>
        )}
      </div>
    );
  }
  return <p>Connected {short(account)}</p>;
}
