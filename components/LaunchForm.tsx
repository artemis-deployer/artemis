"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ImagePlus, X } from "lucide-react";
import { CHAINS, DIRECT_SUPPLY } from "../lib/chains";
import { stripNumericSeparators, validateDraft } from "../lib/draft";
import { isSafeImageSrc, useDraft } from "./DraftContext";
import ChainLogo from "./ChainLogo";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function LaunchForm({ onReview }: { onReview: () => void }) {
  const { draft, setDraft, consent, setConsent, setArtworkFile } = useDraft();
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [networkOpen, setNetworkOpen] = useState(false);
  const networkRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [prevChainId, setPrevChainId] = useState(draft.chainId);
  if (draft.chainId !== prevChainId) {
    setPrevChainId(draft.chainId);
    if (networkOpen) setNetworkOpen(false);
  }

  useEffect(() => {
    if (!networkOpen) return;
    function onDown(e: MouseEvent) {
      if (networkRef.current && !networkRef.current.contains(e.target as Node)) setNetworkOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setNetworkOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [networkOpen]);

  // StrictMode-safe: change/remove paths revoke the old URL synchronously;
  // the effect only tracks latest for unmount revoke, never revokes live URL
  // on re-run (prior [previewUrl] cleanup revoked the new URL on double-invoke).
  useEffect(() => {
    previewRef.current = previewUrl;
  }, [previewUrl]);
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);
  const isSolana = draft.route === "pumpfun" && String(draft.chainId).startsWith("solana");
  const imageOk = isSafeImageSrc(draft.image);
  const errors = imageOk
    ? validateDraft(draft)
    : [...validateDraft(draft), "image is invalid: upload a PNG/JPEG or use an https URL"];
  const chain = CHAINS.find((c) => c.id === draft.chainId) ?? CHAINS[2];
  const mainnet = !chain.testnet;

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
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
        <h3 className="m-0 text-sm font-bold font-unbounded whitespace-nowrap text-white">Launch Parameters</h3>
      </div>

      {/* Coin Preview Card */}
      <div className="flex flex-col gap-3 rounded-lg border border-white/15 bg-[#1a1b1f] p-4">
        <div className="flex items-center justify-between">
          <span className="font-unbounded text-base font-bold text-white">
            {draft.name ? draft.name : "Your coin name"}
          </span>
          <span className="rounded border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold text-white/50 uppercase">
            {draft.ticker ? `${draft.ticker} / Draft` : "TICKER / Draft"}
          </span>
        </div>
        {isSolana ? (
          previewUrl || (draft.image && imageOk) ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Change artwork"
            aria-label="Change coin artwork"
            className="block w-full cursor-pointer overflow-hidden rounded-lg border border-white/15 p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview or user draft image */}
            <img
              src={previewUrl ?? draft.image ?? ""}
              alt={draft.name ? `${draft.name} artwork` : "Coin artwork preview"}
              className="h-52 w-full object-cover"
            />
          </button>
          ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-[#1a1b1f] px-3 py-8 text-sm font-semibold text-white/70 transition-all hover:border-[#fae8a4] hover:text-white"
          >
            <ImagePlus size={22} aria-hidden="true" />
            <span>Drop artwork here or upload</span>
            <span className="text-[11px] font-medium text-white/40">Your coin image appears here</span>
          </button>
          )
        ) : (
          <p className="m-0 rounded-lg border border-white/10 bg-[#1a1b1f] p-3 text-xs text-white/50">
            Coin artwork applies to Solana launches only — EVM tokens carry no onchain image.
          </p>
        )}
        <div className="font-unbounded text-[24px] font-bold leading-none text-[#fae8a4] max-sm:text-xl">
          {draft.ticker ? `$${draft.ticker}` : "$TICKER"}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5 text-[13px]">
          <div>
            <span className="block font-mono text-[10px] font-bold tracking-wider text-white/40 uppercase">Supply</span>
            <span className="font-mono font-semibold text-white">
              {totalSupply.toLocaleString("en-US")} Fixed
            </span>
          </div>
          <div className="text-right">
            <span className="block font-mono text-[10px] font-bold tracking-wider text-white/40 uppercase">Home</span>
            <span className="font-semibold text-white">{chain.name}</span>
          </div>
        </div>
      </div>

      {/* Target Network Selector */}
      <div className="flex flex-col gap-[5px]">
        <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white">
          <span>Target Network</span>
          <span className="text-[11px] font-medium text-white/50">Testnet recommended for rehearsal</span>
        </label>
        <div className="relative" ref={networkRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={networkOpen}
            aria-label="Choose target network"
            onClick={() => setNetworkOpen((o) => !o)}
            className="flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 text-sm text-white transition-all hover:border-white/30"
          >
            <span className="inline-flex shrink-0 text-[#fae8a4]" aria-hidden="true">
              <ChainLogo kind={chain.logo} />
            </span>
            <span className="flex-1 text-left font-bold">{chain.name}</span>
            <span className="font-mono text-[11px] text-white/50">{chain.currency}</span>
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase font-mono ${
              chain.testnet ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-[#fae8a4]/30 text-[#fae8a4] bg-[#fae8a4]/10"
            }`}>
              {chain.testnet ? "Testnet" : "Mainnet"}
            </span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`text-white/50 transition-transform duration-150 ${networkOpen ? "rotate-180" : ""}`}
            />
          </button>
          {networkOpen && (
            <ul
              role="listbox"
              aria-label="Target networks"
              className="drop-in absolute right-0 left-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-white/15 bg-[#1a1b1f] shadow-2xl"
            >
              {CHAINS.map((c) => {
                const active = draft.chainId === c.id;
                const sol = String(c.id).startsWith("solana");
                return (
                  <li key={String(c.id)} role="option" aria-selected={active}>
                    <button
                      type="button"
                      disabled={c.disabled}
                      onClick={() => {
                        setDraft((prev) => ({ ...prev, chainId: c.id, route: sol ? "pumpfun" : "direct" }));
                        setConsent(false);
                        setNetworkOpen(false);
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left text-sm text-white/80 transition-all hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex shrink-0 text-[#fae8a4]" aria-hidden="true">
                        <ChainLogo kind={c.logo} />
                      </span>
                      <span className="flex-1 font-bold text-white">{c.name}</span>
                      {c.disabled ? (
                        <span className="font-mono text-[11px] text-white/40">Coming soon</span>
                      ) : (
                        <>
                          <span className="font-mono text-[11px] text-white/50">{c.currency}</span>
                          <span className="text-[11px] text-white/50">
                            {sol ? "Solana · pump.fun" : "Robinhood Chain · V2 Router"}
                          </span>
                        </>
                      )}
                      {active && <Check size={13} aria-hidden="true" className="shrink-0 text-[#fae8a4]" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
            placeholder="e.g. Artemis Spark"
            value={draft.name}
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
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
            onChange={(e) => setDraft((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
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
            onChange={(e) => setDraft((prev) => ({ ...prev, pooled: stripNumericSeparators(e.target.value) }))}
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
            onChange={(e) => setDraft((prev) => ({ ...prev, liquidity: stripNumericSeparators(e.target.value) }))}
          />
        </div>
      </div>

      {/* Upload Token Icon */}
      <div className="flex flex-col gap-[5px]">
        <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90">
          <span>Token Brand Icon</span>
          <span className="text-[11px] font-medium text-white/40">Optional · Max 2MB</span>
        </label>
        {isSolana && (
        <>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setImageError("");
            if (file.size > MAX_IMAGE_BYTES) {
              setImageError("Image must be under 2MB. Try another file.");
              e.target.value = "";
              return;
            }
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            setFileName(file.name);
            setArtworkFile(file);
          }}
        />
        {previewUrl ? (
          <div className="flex items-center justify-between rounded-lg border border-white/15 bg-[#1a1b1f] p-2.5">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- local object-URL preview, never remote */}
              <img src={previewUrl} alt="Preview" className="h-9 w-9 rounded-full object-cover" />
              <span className="text-xs font-medium text-white/80">{fileName ?? "Image attached"}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
                setFileName(null);
                setArtworkFile(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              aria-label="Remove coin image"
              className="cursor-pointer rounded-md border border-white/15 p-2 text-white/60 hover:border-white/30 hover:text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : draft.image && imageOk ? (
          <div className="flex items-center justify-between rounded-lg border border-white/15 bg-[#1a1b1f] p-2.5">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- user draft image */}
              <img src={draft.image} alt="Preview" className="h-9 w-9 rounded-full object-cover" />
              <span className="text-xs font-medium text-white/80">Image attached</span>
            </div>
            <button
              type="button"
              onClick={() => setDraft((prev) => ({ ...prev, image: undefined }))}
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
            <span>Drop artwork here or upload</span>
          </button>
        )}
        </>
        )}
        <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="artwork-url">
          <span>Artwork URL</span>
          <span className="text-[11px] font-medium text-white/40">Shows in community showcase</span>
        </label>
        <input
          id="artwork-url"
          className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
          placeholder="https://example.com/artwork.png"
          value={draft.image ?? ""}
          maxLength={2048}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => setDraft((prev) => ({ ...prev, image: e.target.value || undefined }))}
        />
        {previewUrl && !draft.image && (
          <p className="m-0 text-xs text-white/50">Uploaded file pins to IPFS on Solana launch. EVM ignores artwork.</p>
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
