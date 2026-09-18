"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { ensureChain } from "../lib/launcher-evm";
import {
  clearWallet,
  detectEvm,
  getEvmBalance,
  loadWallet,
  silentEvmAccount,
  walletLabel,
  type EvmWalletId,
} from "../lib/wallets";
import { getChain } from "../lib/chains";
import WalletModal from "./WalletModal";

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton({ chainId }: { chainId: 4663 | 46630 }) {
  const [account, setAccount] = useState<Address | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const currency = getChain(chainId)?.currency ?? "ETH";

  const refresh = useCallback(async () => {
    const stored = loadWallet();
    if (!stored || stored.kind !== "evm") {
      setAccount(null);
      setBalance(null);
      return;
    }
    try {
      await ensureChain(chainId);
    } catch (e) {
      setError(walletLabel(e));
      return;
    }
    const addr = await silentEvmAccount(stored.id as EvmWalletId);
    setAccount(addr as Address | null);
    if (addr) {
      const provider = detectEvm(stored.id as EvmWalletId);
      setBalance(provider ? await getEvmBalance(provider, addr) : null);
    } else {
      setBalance(null);
    }
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
    setBalance(null);
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
          className="nav-wallet-btn"
        >
          <span>Connect Wallet</span> <span>↗</span>
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
    <div className="nav-connected">
      <span>
        {short(account)}
        {balance !== null && ` · ${balance} ${currency}`}
      </span>
      <button type="button" onClick={disconnect} title="Disconnect wallet" aria-label="Disconnect wallet">
        ×
      </button>
    </div>
  );
}
