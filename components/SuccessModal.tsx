"use client";

import { useEffect, useRef } from "react";
import { BadgeCheck, ExternalLink, X } from "lucide-react";
import { explorerTokenUrl, explorerTxUrl, getChain } from "../lib/chains";

export type LaunchSuccess = {
  chainId: number | string;
  token: string;
  hash: string;
  ticker: string;
  name: string;
  rehearsal?: boolean;
  showcase?: "listed" | "pending";
};

export default function SuccessModal({ info, onClose }: { info: LaunchSuccess | null; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!info) return;
    const prevOverflow = document.body.style.overflow;
    const prevActive = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [info]);

  if (!info) return null;
  const chain = getChain(info.chainId);
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Launch successful"
    >
      <div
        className="modal-pop flex w-full max-w-[420px] flex-col gap-3.5 rounded-2xl border border-white/15 bg-[#1a1b1f] p-6 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="m-0 flex items-center gap-1.5 font-mono text-[11px] font-bold tracking-[0.15em] text-emerald-300 uppercase">
              <BadgeCheck size={14} aria-hidden="true" />
              <span>{info.rehearsal ? "Rehearsal — token only, pool stubbed" : "Launch successful"}</span>
            </p>
            <h3 className="m-0 mt-1 text-xl font-bold font-unbounded text-white">
              {info.name || info.ticker || "Your coin"} {info.rehearsal ? "is ready" : "is live"}
            </h3>
          </div>
          <button
            type="button"
            ref={closeRef}
            onClick={onClose}
            aria-label="Close success dialog"
            className="cursor-pointer rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-[#131219] p-3.5 text-[13px]">
          <dt className="font-medium text-white/50">Ticker:</dt>
          <dd className="m-0 text-right font-mono font-bold break-all text-[#fae8a4] uppercase">
            {info.ticker || "-"}
          </dd>
          <dt className="font-medium text-white/50">Network:</dt>
          <dd className="m-0 text-right font-semibold break-all text-white">{chain?.name ?? String(info.chainId)}</dd>
          <dt className="font-medium text-white/50">Token:</dt>
          <dd className="m-0 text-right font-mono break-all">
            {info.rehearsal ? (
              <span className="text-white/70">{info.token.slice(0, 10)}…{info.token.slice(-8)} (pool stubbed)</span>
            ) : (
            <a
              href={explorerTokenUrl(info.chainId, info.token)}
              target="_blank"
              rel="noreferrer"
              className="underline inline-flex items-center gap-0.5 text-[#b9e2f8]"
            >
              <span>{info.token.slice(0, 10)}…{info.token.slice(-8)}</span>
              <ExternalLink size={11} />
            </a>
            )}
          </dd>
          {info.showcase !== undefined && (
            <>
              <dt className="font-medium text-white/50">Showcase:</dt>
              <dd className="m-0 text-right font-semibold break-all text-white">{info.showcase}</dd>
            </>
          )}
          <dt className="font-medium text-white/50">Transaction:</dt>
          <dd className="m-0 text-right font-mono break-all">
            {info.hash ? (
            <a
              href={explorerTxUrl(info.chainId, info.hash)}
              target="_blank"
              rel="noreferrer"
              className="underline inline-flex items-center gap-0.5 text-[#b9e2f8]"
            >
              <span>{info.hash.slice(0, 10)}…{info.hash.slice(-8)}</span>
              <ExternalLink size={11} />
            </a>
            ) : (
              <span className="text-white/50">—</span>
            )}
          </dd>
        </dl>

        <div className="flex gap-2">
          <a
            href={explorerTokenUrl(info.chainId, info.token)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#fae8a4] px-5 py-2.5 text-sm font-bold text-[#17131f] no-underline transition-all hover:bg-[#f1d2e8]"
          >
            View token <ExternalLink size={14} />
          </a>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10"
          >
            Back to studio
          </button>
        </div>
      </div>
    </div>
  );
}
