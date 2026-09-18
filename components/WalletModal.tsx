"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  connectEvm,
  connectSolana,
  detectEvm,
  detectSolana,
  EVM_WALLETS,
  SOLANA_WALLETS,
  walletLabel,
  type EvmWalletId,
  type SolanaWalletId,
  type WalletKind,
} from "../lib/wallets";

export default function WalletModal({
  kind,
  open,
  onClose,
  onConnected,
}: {
  kind: WalletKind;
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  if (!open) return null;

  const options = kind === "evm" ? EVM_WALLETS : SOLANA_WALLETS;

  async function choose(id: EvmWalletId | SolanaWalletId, detected: boolean, installUrl: string) {
    if (!detected) {
      window.open(installUrl, "_blank", "noopener");
      return;
    }
    setError("");
    setBusy(id);
    try {
      if (kind === "evm") await connectEvm(id as EvmWalletId);
      else await connectSolana(id as SolanaWalletId);
      onConnected();
      onClose();
    } catch (e) {
      setError(walletLabel(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className="wallet-overlay-in fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={kind === "evm" ? "Connect Ethereum wallet" : "Connect Solana wallet"}
      onClick={onClose}
    >
      <div
        className="wallet-panel-in flex max-h-[85vh] w-full max-w-[420px] flex-col gap-1 overflow-hidden rounded-2xl border border-white/15 bg-[#1a1b1f] p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="m-0 text-lg font-bold font-unbounded text-white">
              {kind === "evm" ? "Connect Ethereum wallet" : "Connect Solana wallet"}
            </h3>
            <p className="m-0 mt-0.5 text-xs text-white/50">Pick a wallet to continue. No keys leave your device.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet picker"
            className="cursor-pointer rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto">
          {options.map((o) => {
            const detected =
              kind === "evm" ? detectEvm(o.id as EvmWalletId) !== null : detectSolana(o.id as SolanaWalletId) !== null;
            return (
              <button
                key={o.id}
                type="button"
                disabled={busy !== null}
                onClick={() => void choose(o.id, detected, o.installUrl)}
                className={`flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all disabled:cursor-wait disabled:opacity-60 ${
                  detected
                    ? "border-white/10 bg-[#131416] hover:border-[#fae8a4] hover:bg-white/5"
                    : "border-dashed border-white/15 bg-white/5 hover:border-white/30"
                }`}
              >
                <span className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local wallet brand icons */}
                  <img src={o.icon} alt="" aria-hidden="true" className="h-9 w-9 rounded-full bg-white object-contain p-0.5" />
                  <span className="text-sm font-bold text-white">{o.name}</span>
                </span>
                <span className="text-xs font-semibold text-white/50 font-mono">
                  {busy === o.id ? "Connecting…" : detected ? "Connect →" : "Install →"}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="m-0 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
