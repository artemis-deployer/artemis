"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clearWallet,
  detectSolana,
  getActiveSolanaProvider,
  getSolanaBalance,
  loadWallet,
  type SolanaWalletId,
} from "../lib/wallets";
import { DEVNET_RPC, MAINNET_RPC } from "../lib/launcher-solana";
import WalletMenu from "./WalletMenu";
import WalletModal from "./WalletModal";

export type SolanaProvider = {
  publicKey: { toBase58(): string };
  connect(): Promise<unknown>;
  signTransaction: <T>(tx: T) => Promise<T>;
};

export function getSolanaProvider(): SolanaProvider | null {
  return getActiveSolanaProvider() as SolanaProvider | null;
}

function short(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export default function SolanaButton({
  onConnect,
  rpc,
}: {
  onConnect?: (p: SolanaProvider) => void;
  rpc?: string;
}) {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [modal, setModal] = useState(false);

  const refresh = useCallback(async () => {
    const stored = loadWallet();
    if (!stored || stored.kind !== "solana") {
      setAccount(null);
      setBalance(null);
      return;
    }
    const p = detectSolana(stored.id as SolanaWalletId);
    let addr = stored.address;
    try {
      if (p) addr = p.publicKey.toBase58();
    } catch {
      // extension locked: fall back to the stored address
    }
    setAccount(addr);
    if (p && onConnect) onConnect(p as unknown as SolanaProvider);
    // Query the active network only: mainnet-first fallback shows the wrong balance on devnet.
    setBalance(await getSolanaBalance(addr, rpc ?? MAINNET_RPC));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onConnect is a stable-ish dialog callback
  }, [rpc]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only hydrate from wallet extension
    void refresh();
  }, [refresh]);

  function disconnect() {
    clearWallet();
    setAccount(null);
    setBalance(null);
  }

  if (account) {
    const solscan = rpc === DEVNET_RPC ? "https://solscan.io?cluster=devnet" : "https://solscan.io";
    return (
      <WalletMenu
        shortLabel={short(account)}
        address={account}
        balance={balance !== null ? `${balance} SOL` : null}
        explorerHref={`${solscan}/account/${account}`}
        explorerName="Solscan"
        onRefresh={() => void refresh()}
        onDisconnect={disconnect}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => setModal(true)} className="nav-wallet-btn">
        <span>Connect Wallet</span> <span>↗</span>
      </button>
      <WalletModal kind="solana" open={modal} onClose={() => setModal(false)} onConnected={() => void refresh()} />
    </div>
  );
}
