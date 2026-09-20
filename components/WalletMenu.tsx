"use client";

import { useEffect, useRef, useState } from "react";

export default function WalletMenu({
  shortLabel,
  address,
  balance,
  explorerHref,
  explorerName,
  onRefresh,
  onDisconnect,
}: {
  shortLabel: string;
  address: string;
  balance: string | null;
  explorerHref: string;
  explorerName: string;
  onRefresh: () => void | Promise<void>;
  onDisconnect: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function reload() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Wallet details"
        onClick={() => setOpen((o) => !o)}
        className="nav-connected cursor-pointer"
      >
        <span>
          {shortLabel}
          {balance !== null && ` · ${balance}`}
        </span>
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Connected wallet"
          className="drop-in absolute right-0 z-30 mt-1.5 w-64 overflow-hidden rounded-lg border border-white/15 bg-[#1a1b1f] p-3 shadow-2xl"
        >
          <p className="m-0 mb-1 font-mono text-[10px] tracking-wider text-white/40 uppercase">Wallet</p>
          <p className="m-0 mb-2.5 font-mono text-xs break-all text-white">{address}</p>
          <p className="m-0 mb-1 font-mono text-[10px] tracking-wider text-white/40 uppercase">Balance</p>
          <p className="m-0 mb-3 font-mono text-sm font-bold text-white">{refreshing ? "…" : (balance ?? "—")}</p>
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/10"
            >
              {copied ? "Copied ✓" : "Copy address"}
            </button>
            <button
              type="button"
              onClick={() => void reload()}
              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/10"
            >
              {refreshing ? "Refreshing…" : "Refresh balance"}
            </button>
            <a
              href={explorerHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white no-underline transition-all hover:bg-white/10"
            >
              View on {explorerName} ↗
            </a>
            <button
              type="button"
              onClick={() => {
                onDisconnect();
                setOpen(false);
              }}
              className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/20"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
