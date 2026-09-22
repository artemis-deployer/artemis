"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Address } from "viem";
import { ensureChain, getHoodConfig, publicClientFor } from "../lib/launcher-evm";
import {
  clearWallet,
  detectEvm,
  formatWei,
  getEvmChainId,
  loadWallet,
  silentEvmAccount,
  walletLabel,
  type EvmWalletId,
} from "../lib/wallets";
import { getChain } from "../lib/chains";
import WalletMenu from "./WalletMenu";
import WalletModal from "./WalletModal";

function short(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function WalletButton({
  chainId,
  onConnect,
}: {
  chainId: 4663 | 46630;
  onConnect?: (account: Address | null) => void;
}) {
  const [account, setAccount] = useState<Address | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [error, setError] = useState("");
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const currency = getChain(chainId)?.currency ?? "ETH";
  const chainName = getChain(chainId)?.name ?? "Hood";
  // Stabilize parent callback: inline arrows would retrigger refresh + resubscribe loops.
  const onConnectRef = useRef(onConnect);
  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);
  // Seq guard: overlapping refresh() calls (chain flip / wallet events) must not
  // let a stale async response overwrite newer account/balance state.
  const seqRef = useRef(0);

  const refresh = useCallback(async () => {
    const my = ++seqRef.current;
    const stored = loadWallet();
    if (!stored || stored.kind !== "evm") {
      if (seqRef.current !== my) return;
      setAccount(null);
      setBalance(null);
      setWrongNetwork(false);
      return;
    }
    // No auto-switch here: read quietly, flag a wrong network instead.
    // Auto-switching fired surprise wallet popups and looked like "connect again".
    const addr = await silentEvmAccount(stored.id as EvmWalletId);
    if (seqRef.current !== my) return;
    setAccount(addr as Address | null);
    onConnectRef.current?.(addr as Address | null);
    if (!addr) {
      setBalance(null);
      setWrongNetwork(false);
      return;
    }
    const provider = detectEvm(stored.id as EvmWalletId);
    const walletChain = provider ? await getEvmChainId(provider) : null;
    if (seqRef.current !== my) return;
    setWrongNetwork(walletChain !== null && walletChain !== chainId);
    try {
      const cfg = getHoodConfig(chainId);
      const wei = cfg ? await publicClientFor(cfg).getBalance({ address: addr as Address }) : null;
      if (seqRef.current !== my) return;
      setBalance(wei === null ? null : formatWei(wei));
    } catch {
      if (seqRef.current !== my) return;
      setBalance(null);
    }
    setError("");
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
      const next = list[0] ?? "";
      if (list.length === 0 || !/^0x[0-9a-fA-F]{40}$/.test(next)) {
        clearWallet();
        setAccount(null);
        setBalance(null);
        setWrongNetwork(false);
        onConnectRef.current?.(null);
      } else {
        void refresh();
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
    // refresh already tracks chainId; resub only on wallet transport change.
  }, [refresh]);

  function disconnect() {
    seqRef.current++;
    clearWallet();
    setAccount(null);
    setBalance(null);
    setWrongNetwork(false);
    setError("");
    onConnectRef.current?.(null);
  }

  async function switchChain() {
    setError("");
    try {
      await ensureChain(chainId);
    } catch (e) {
      setError(walletLabel(e));
      return;
    }
    await refresh();
  }

  if (!account) {
    return (
      <div className="relative flex items-center gap-2">
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
          <button
            type="button"
            role="alert"
            title="Dismiss"
            onClick={() => setError("")}
            className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 max-w-[calc(100vw-40px)] rounded-lg border border-red-500/30 bg-[#1a1b1f] p-2.5 text-left text-[11px] font-medium leading-relaxed text-red-300 shadow-2xl"
          >
            {error}
          </button>
        )}
        <WalletModal kind="evm" open={modal} onClose={() => setModal(false)} onConnected={() => void refresh()} />
      </div>
    );
  }

  return (
    <div className="relative flex min-w-0 items-center gap-2">
      {wrongNetwork && (
        <button
          type="button"
          onClick={() => void switchChain()}
          title={`Switch wallet to ${chainName}`}
          className="inline-flex min-h-9 max-w-[38vw] shrink-0 cursor-pointer items-center justify-center gap-1.5 truncate rounded-lg border border-amber-300/40 bg-amber-300/10 px-2.5 py-1.5 text-[11px] font-bold whitespace-nowrap text-amber-200 transition-all hover:bg-amber-300/20"
        >
          Switch to {chainName}
        </button>
      )}
      <WalletMenu
        shortLabel={short(account)}
        address={account}
        balance={balance !== null ? `${balance} ${currency}` : null}
        explorerHref={`${getChain(chainId)?.explorer ?? "https://blockscout.com"}/address/${account}`}
        explorerName="Explorer"
        onRefresh={() => void refresh()}
        onDisconnect={disconnect}
      />
      {error && (
        <button
          type="button"
          role="alert"
          title="Dismiss"
          onClick={() => setError("")}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 max-w-[calc(100vw-40px)] rounded-lg border border-red-500/30 bg-[#1a1b1f] p-2.5 text-left text-[11px] font-medium leading-relaxed text-red-300 shadow-2xl"
        >
          {error}
        </button>
      )}
    </div>
  );
}
