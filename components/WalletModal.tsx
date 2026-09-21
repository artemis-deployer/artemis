"use client";

import { useEffect, useRef, useState } from "react";
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
  const choosingRef = useRef(false);
  const [tab, setTab] = useState<WalletKind>(kind);
  const [syncedKind, setSyncedKind] = useState<WalletKind>(kind);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);
  if (open && syncedKind !== kind) {
    setSyncedKind(kind);
    setTab(kind);
    setError("");
  }
  if (!open) return null;

  const options = tab === "evm" ? EVM_WALLETS : SOLANA_WALLETS;

  async function choose(id: EvmWalletId | SolanaWalletId, detected: boolean, installUrl: string) {
    if (!detected) {
      try {
        const win = window.open(installUrl, "_blank", "noopener");
        if (!win) setError("Popup blocked by the browser — allow popups for this site, then retry.");
      } catch {
        setError("Popup blocked by the browser — allow popups for this site, then retry.");
      }
      return;
    }
    if (choosingRef.current) return;
    choosingRef.current = true;
    setError("");
    setBusy(id);
    try {
      if (tab === "evm") await connectEvm(id as EvmWalletId);
      else await connectSolana(id as SolanaWalletId);
      onConnected();
      onClose();
    } catch (e) {
      setError(walletLabel(e));
    } finally {
      choosingRef.current = false;
      setBusy(null);
    }
  }

  return (
    <div
      className="wallet-overlay-in fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
        aria-label={tab === "evm" ? "Connect Ethereum wallet" : "Connect Solana wallet"}
      onClick={onClose}
    >
      <div
        className="wallet-panel-in flex max-h-[85vh] w-full max-w-[420px] flex-col gap-1 overflow-hidden rounded-2xl border border-white/15 bg-[#1a1b1f] p-6 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h3 className="m-0 text-lg font-bold font-unbounded text-white">
              {tab === "evm" ? "Connect Ethereum wallet" : "Connect Solana wallet"}
            </h3>
            <p className="m-0 mt-0.5 text-xs text-white/50">Pick a wallet to continue. No keys leave your device.</p>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close wallet picker"
            className="cursor-pointer rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-3 flex gap-2" role="tablist" aria-label="Wallet type">
          {(["evm", "solana"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              disabled={busy !== null}
              onClick={() => {
                setTab(t);
                setError("");
              }}
              className={`min-h-9 flex-1 cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-all disabled:cursor-wait disabled:opacity-60 ${
                tab === t
                  ? "border-[#fae8a4] bg-[#fae8a4]/10 text-[#fae8a4]"
                  : "border-white/10 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
              }`}
            >
              {t === "evm" ? "Ethereum" : "Solana"}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto">
          {options.map((o) => {
            const detected =
              tab === "evm" ? detectEvm(o.id as EvmWalletId) !== null : detectSolana(o.id as SolanaWalletId) !== null;
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

        {busy !== null && (
          <p role="status" className="m-0 mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/70">
            Approve the request in your wallet app. No popup appeared? Allow popups for this site, then retry.
          </p>
        )}

        {error && (
          <p role="alert" className="m-0 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-300">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
