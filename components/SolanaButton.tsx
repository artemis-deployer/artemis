"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearWallet,
  detectSolana,
  getActiveSolanaProvider,
  loadWallet,
  type SolanaWalletId,
} from "../lib/wallets";
import WalletModal from "./WalletModal";

export type SolanaProvider = {
  publicKey: { toBase58(): string };
  connect(): Promise<unknown>;
  signTransaction: <T>(tx: T) => Promise<T>;
};

export function getSolanaProvider(): SolanaProvider | null {
  return getActiveSolanaProvider() as SolanaProvider | null;
}

export default function SolanaButton({ onConnect }: { onConnect?: (p: SolanaProvider) => void }) {
  const [account, setAccount] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const refresh = useCallback(() => {
    const stored = loadWallet();
    if (!stored || stored.kind !== "solana") {
      setAccount(null);
      return;
    }
    const p = detectSolana(stored.id as SolanaWalletId);
    try {
      setAccount(p ? p.publicKey.toBase58() : stored.address);
    } catch {
      setAccount(stored.address);
    }
    if (p && onConnect) onConnect(p as unknown as SolanaProvider);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onConnect is a stable-ish dialog callback
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only hydrate from wallet extension
    refresh();
  }, [refresh]);

  function disconnect() {
    clearWallet();
    setAccount(null);
  }

  if (account) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <div className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/90">
          <span>Connected: {account.slice(0, 4)}…{account.slice(-4)}</span>
        </div>
        <button
          type="button"
          onClick={disconnect}
          title="Disconnect wallet"
          className="cursor-pointer rounded border border-white/20 bg-white/5 px-2 py-1.5 text-xs font-semibold text-white/60 hover:border-white/40 hover:text-white"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setModal(true)}
        className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-all hover:border-white/40 hover:bg-white/10"
      >
        <span>Connect Solana</span>
      </button>
      <WalletModal kind="solana" open={modal} onClose={() => setModal(false)} onConnected={refresh} />
    </div>
  );
}
