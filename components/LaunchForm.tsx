"use client";

import { useRef, useState } from "react";
import { ArrowRight, ImagePlus, X } from "lucide-react";
import { CHAINS, DIRECT_SUPPLY } from "../lib/chains";
import { stripNumericSeparators, validateDraft } from "../lib/draft";
import { isSafeImageSrc, useDraft } from "./DraftContext";

/** Downscale an image file to a small data URL (max 512px, JPEG). */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 512 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("image_failed"));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_failed"));
    };
    img.src = url;
  });
}

export default function LaunchForm({ onReview }: { onReview: () => void }) {
  const { draft, setDraft, consent, setConsent } = useDraft();
  const [imageError, setImageError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const imageOk = isSafeImageSrc(draft.image);
  const errors = imageOk
    ? validateDraft(draft)
    : [...validateDraft(draft), "image is invalid: upload a PNG/JPEG or use an https URL"];
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  const mainnet = !chain.testnet;

  const isSolana = draft.route === "pumpfun" && String(draft.chainId).startsWith("solana");
  const totalSupply = isSolana ? 1_000_000_000 : DIRECT_SUPPLY;
  const pooledNumber = Number(draft.pooled) || 0;
  const liquidityNumber = Number(draft.liquidity) || 0;
  const pooledPercent = pooledNumber > 0 ? ((pooledNumber / totalSupply) * 100).toFixed(1) : "0";
  const estimatedPrice =
    pooledNumber > 0 && liquidityNumber > 0
      ? (liquidityNumber / pooledNumber).toLocaleString("en-US", { maximumSignificantDigits: 4 })
      : null;

  return (
    <section className="flex flex-col gap-[18px] rounded-xl border border-white/10 bg-[#1a1b1f] p-7 shadow-2xl text-white max-sm:p-[18px]" aria-label="Your launch">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div>
          <h3 className="m-0 text-lg font-bold font-unbounded text-white">Launch Parameters</h3>
          <p className="m-0 mt-0.5 text-xs text-white/50">
            Configure parameters or let Kentir Copilot draft them
          </p>
        </div>
        <span className="rounded border border-white/15 px-2.5 py-1 text-xs font-mono text-[#cadcf0]">
          Non-Custodial
        </span>
      </div>

      {/* Live Token Stamp Preview */}
      <div className="flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-[#1a1b1f] px-[18px] py-3.5 max-sm:flex-wrap">
        <div className="flex items-baseline gap-2">
          {draft.image && imageOk && (
            /* eslint-disable-next-line @next/next/no-img-element -- local data-URL preview, never remote */
            <img src={draft.image} alt="" aria-hidden="true" className="h-7 w-7 self-center rounded-full border border-white/15 object-cover" />
          )}
          <span className="font-unbounded text-[24px] font-bold leading-none text-[#fae8a4] max-sm:text-xl">
            {draft.ticker ? `$${draft.ticker}` : "$TICKER"}
          </span>
          <span className="text-[13px] font-medium text-white/80">
            {draft.name ? draft.name : "Your Coin Draft"}
          </span>
        </div>
        <div className="text-right">
          <span className="block font-mono text-[11px] font-bold text-white/50 uppercase">{chain.name}</span>
          <span className="text-[11px] font-mono text-[#cadcf0]">
            {totalSupply.toLocaleString("en-US")} Fixed
          </span>
        </div>
      </div>

      {/* Target Network Selector */}
      <div className="flex flex-col gap-[5px]">
        <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white">
          <span>Target Network</span>
          <span className="text-[11px] font-medium text-white/50">Testnet recommended for rehearsal</span>
        </label>
        <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
          {CHAINS.map((c) => {
            const active = draft.chainId === c.id;
            const sol = String(c.id).startsWith("solana");
            return (
              <div
                key={String(c.id)}
                onClick={() => {
                  setDraft({
                    ...draft,
                    chainId: c.id,
                    route: sol ? "pumpfun" : "direct",
                  });
                  setConsent(false);
                }}
                className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 transition-all ${
                  active
                    ? "border-[#fae8a4] bg-[#1e1c28] shadow-md"
                    : "border-white/10 bg-[#1a1b1f] hover:border-white/20"
                }`}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    setDraft({ ...draft, chainId: c.id, route: sol ? "pumpfun" : "direct" });
                    setConsent(false);
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2 text-sm font-bold text-white">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`flex h-4 w-4 items-center justify-center rounded-full border text-[10px] leading-none ${
                        active ? "border-[#fae8a4] bg-[#fae8a4] text-[#18191c]" : "border-white/25 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span>{c.name}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#cadcf0]">
                      {c.currency}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase font-mono ${
                      c.testnet ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-[#fae8a4]/30 text-[#fae8a4] bg-[#fae8a4]/10"
                    }`}>
                      {c.testnet ? "Testnet" : "Mainnet"}
                    </span>
                  </span>
                </div>
                <span className="text-[11px] text-white/50">
                  {sol ? "Solana · pump.fun" : "Robinhood Chain · V2 Router"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Inputs Grid */}
      <div className="grid grid-cols-2 gap-3.5 max-sm:grid-cols-1">
        <div className="flex flex-col gap-[5px]">
          <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="token-name">
            <span>Coin Name</span>
            <span className="text-[11px] font-medium text-white/40">Optional</span>
          </label>
          <input
            id="token-name"
            className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
            placeholder="e.g. Kentir Spark"
            value={draft.name}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="token-ticker">
            <span>Ticker Symbol</span>
            <span className="font-bold text-[#fae8a4]">*</span>
          </label>
          <input
            id="token-ticker"
            className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 font-mono text-sm font-bold tracking-wider text-white uppercase placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
            placeholder="e.g. SPARK"
            value={draft.ticker}
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-required="true"
            onChange={(e) => setDraft({ ...draft, ticker: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="pool-tokens">
            <span>Tokens for Liquidity Pool</span>
            <span className="text-[11px] font-medium text-white/40">
              {isSolana ? "Direct pools only" : `Max ${totalSupply.toLocaleString("en-US")}`}
            </span>
          </label>
          <input
            id="pool-tokens"
            className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 font-mono text-sm text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
            inputMode="decimal"
            placeholder="e.g. 500000000"
            value={draft.pooled}
            maxLength={30}
            autoComplete="off"
            spellCheck={false}
            aria-required={!isSolana}
            onChange={(e) => setDraft({ ...draft, pooled: stripNumericSeparators(e.target.value) })}
          />
        </div>

        <div className="flex flex-col gap-[5px]">
          <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="initial-liquidity">
            <span>Starting Deposit ({chain.currency})</span>
            <span className="text-[11px] font-medium text-white/40">Paired liquidity</span>
          </label>
          <input
            id="initial-liquidity"
            className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 font-mono text-sm text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
            inputMode="decimal"
            placeholder="e.g. 0.5"
            value={draft.liquidity}
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            aria-required="true"
            onChange={(e) => setDraft({ ...draft, liquidity: stripNumericSeparators(e.target.value) })}
          />
        </div>
      </div>

      {/* Upload Token Icon */}
      <div className="flex flex-col gap-[5px]">
        <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90">
          <span>Token Brand Icon</span>
          <span className="text-[11px] font-medium text-white/40">Optional · Max 512px</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImageError("");
            fileToDataUrl(file)
              .then((dataUrl) => setDraft({ ...draft, image: dataUrl }))
              .catch(() => setImageError("Image processing failed. Try another file."));
          }}
        />
        {draft.image ? (
          <div className="flex items-center justify-between rounded-lg border border-white/15 bg-[#1a1b1f] p-2.5">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- user draft image */}
              <img src={draft.image} alt="Preview" className="h-9 w-9 rounded-full object-cover" />
              <span className="text-xs font-medium text-white/80">Image attached</span>
            </div>
            <button
              type="button"
              onClick={() => setDraft({ ...draft, image: undefined })}
              aria-label="Remove coin image"
              className="cursor-pointer rounded-md border border-white/15 p-2 text-white/60 hover:border-white/30 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#1a1b1f] px-3 py-2.5 text-sm font-semibold text-white/70 transition-all hover:border-[#fae8a4] hover:text-white"
          >
            <ImagePlus size={16} aria-hidden="true" />
            <span>Upload image (PNG/JPEG)</span>
          </button>
        )}
        {imageError && (
          <p role="alert" className="m-0 text-xs font-medium text-red-300">
            {imageError}
          </p>
        )}
      </div>

      {/* Economics Preview */}
      <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-[#1a1b1f] px-4 py-3">
        <div className="mb-1 text-xs font-bold tracking-wider text-white uppercase font-mono">
          Pool Economics Preview
        </div>
        <div className="flex justify-between gap-3 text-[13px]">
          <span className="text-white/50">Total Fixed Supply:</span>
          <span className="text-right font-mono font-semibold break-words text-white">
            {totalSupply.toLocaleString("en-US")} {draft.ticker || "TOKENS"} (No Mint)
          </span>
        </div>
        <div className="flex justify-between gap-3 text-[13px]">
          <span className="text-white/50">Pool Allocation:</span>
          <span className="text-right font-mono font-semibold break-words text-white">
            {pooledNumber.toLocaleString("en-US")} ({pooledPercent}%)
          </span>
        </div>
        {estimatedPrice && (
          <div className="flex justify-between gap-3 text-[13px]">
            <span className="text-white/50">Opening Est. Price:</span>
            <span className="text-right font-mono font-semibold break-words text-[#cadcf0]">
              ~{estimatedPrice} {chain.currency} / token
            </span>
          </div>
        )}
      </div>

      {/* Mainnet Notice */}
      {mainnet && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-white/10 bg-[#1a1b1f] px-3.5 py-3 text-xs text-white">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#fae8a4]"
          />
          <div>
            <span className="block font-bold">Mainnet Real Funds Confirmation</span>
            <span className="block text-xs text-white/50">
              I have checked network, token allocations, and transaction gas requirements.
            </span>
          </div>
        </label>
      )}

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-1 rounded border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {errors.map((x) => (
            <p key={x} role="alert" className="m-0 font-medium">
              • {x}
            </p>
          ))}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="button"
        disabled={errors.length > 0 || (mainnet && !consent)}
        onClick={onReview}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#fae8a4] px-6 py-3 text-base font-bold text-[#18191c] transition-all hover:bg-[#ece4d4] disabled:cursor-not-allowed disabled:border disabled:border-white/10 disabled:bg-white/5 disabled:text-white/30 cursor-pointer"
      >
        <span>Review Your Launch</span>
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
