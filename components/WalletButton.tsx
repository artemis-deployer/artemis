"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { ensureChain } from "../lib/launcher-evm";
import {
  clearWallet,
  detectEvm,
  loadWallet,
  silentEvmAccount,
  walletLabel,
  type EvmWalletId,
} from "../lib/wallets";
import WalletModal from "./WalletModal";

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton({ chainId }: { chainId: 4663 | 46630 }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    const stored = loadWallet();
    if (!stored || stored.kind !== "evm") {
      setAccount(null);
      return;
    }
    try {
      await ensureChain(chainId);
    } catch (e) {
      setError(walletLabel(e));
      return;
    }
    setAccount((await silentEvmAccount(stored.id as EvmWalletId)) as Address | null);
  }, [chainId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only hydrate from wallet extension
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const stored = loadWallet();
    if (!stored || stored.kind !== "evm") return;
    const provider = detectEvm(stored.id as EvmWalletId);
    const onAccounts = (accs: never[]) => {
      const list = accs as unknown as string[];
      if (list.length === 0) {
        clearWallet();
        setAccount(null);
      } else {
        setAccount(list[0] as Address);
      }
    };
    const onChain = () => {
      void refresh();
    };
    try {
      provider?.on?.("accountsChanged", onAccounts);
      provider?.on?.("chainChanged", onChain);
    } catch {
      // provider without events: polling-free, state checked on demand
    }
    return () => {
      try {
        provider?.removeListener?.("accountsChanged", onAccounts);
        provider?.removeListener?.("chainChanged", onChain);
      } catch {
        // already gone
      }
    };
  }, [refresh]);

  function disconnect() {
    clearWallet();
    setAccount(null);
    setError("");
  }

  if (!account) {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            setError("");
            setModal(true);
          }}
          className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded border border-white/20 bg-white/5 px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white transition-all hover:border-white/40 hover:bg-white/10"
        >
          <span>Connect Ethereum</span>
        </button>
        {error && (
          <p role="alert" className="m-0 text-xs font-medium text-red-400">
            {error}
          </p>
        )}
        <WalletModal kind="evm" open={modal} onClose={() => setModal(false)} onConnected={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="inline-flex items-center gap-2 rounded border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-mono text-white/90">
        <span>Connected: {short(account)}</span>
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
