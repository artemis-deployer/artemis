"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Copy, Download, ExternalLink, ImagePlus, Sparkles, X } from "lucide-react";
import { CHAINS, DIRECT_SUPPLY } from "../lib/chains";
import { logoFallbackUrl, normalizeWebUrl, normalizeXUrl, stripNumericSeparators, validateDraft } from "../lib/draft";
import { isSafeImageSrc, useDraft } from "./DraftContext";
import ChainLogo from "./ChainLogo";
import ConceptLogo, { downloadLogo } from "./ConceptLogo";
import CropModal from "./CropModal";
import ZkVerifyPanel from "./ZkVerifyPanel";
import { resolveLogo } from "../lib/logo";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export default function LaunchForm({ onReview }: { onReview: () => void }) {
  const { draft, setDraft, consent, setConsent, setArtworkFile } = useDraft();
  const [imageError, setImageError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pinning, setPinning] = useState(false);
  const [logoSeed, setLogoSeed] = useState(() => Math.floor(Math.random() * 1000000));
  const [logoCopied, setLogoCopied] = useState(false);
  // True while the preview artwork is still loading: redraw buttons lock (anti-spam).
  const [logoLoading, setLogoLoading] = useState(false);
  const [cropSrc, setCropSrc] = useState<{ url: string; name: string; type: string } | null>(null);
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

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError("");
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file (PNG, JPEG, WebP, GIF).");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("Image must be under 2MB. Try another file.");
      e.target.value = "";
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc.url);
    // Square 1:1 crop first — preview, showcase, and uploads all use the cropped file.
    setCropSrc({ url: URL.createObjectURL(file), name: file.name, type: file.type });
    e.target.value = "";
  }

  const forgingRef = useRef(false);

  /** Google → IPFS, Pollinations fallback. Locks buttons for the whole flight. */
  async function forgeLogo(seed: number) {
    const prompt = draft.logoPrompt;
    if (!prompt || forgingRef.current) return;
    forgingRef.current = true;
    setLogoLoading(true);
    try {
      const done = await resolveLogo(prompt, seed);
      setDraft((prev) => ({ ...prev, image: done.url }));
    } finally {
      forgingRef.current = false;
      setLogoLoading(false);
    }
  }

  function pinEvmFile(file: File) {
    // EVM carries no onchain image: pin immediately so the URL lands in the showcase.
    setPinning(true);
    void (async () => {
      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("read")));
          reader.onerror = () => reject(new Error("read"));
          reader.readAsDataURL(file);
        });
        const res = await fetch("/api/pump-metadata", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ imageData: dataUrl, artworkOnly: true }),
        });
        const json = (await res.json().catch(() => null)) as { imageUri?: string } | null;
        if (!res.ok || !json?.imageUri) throw new Error("pin");
        setDraft((prev) => ({ ...prev, image: json.imageUri }));
      } catch {
        setImageError("Artwork pin failed. Paste an https URL instead.");
      } finally {
        setPinning(false);
      }
    })();
  }

  function handleCropDone(file: File) {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    // Recompute rail at confirm time: user may switch network while cropping.
    const solana = draft.route === "pumpfun" && String(draft.chainId).startsWith("solana");
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    if (solana) {
      setArtworkFile(file);
      return;
    }
    pinEvmFile(file);
  }

  function handleCropCancel() {
    setCropSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }
  const isSolana = draft.route === "pumpfun" && String(draft.chainId).startsWith("solana");
  const imageOk = isSafeImageSrc(draft.image);
  const xUrlError =
    draft.xUrl && !normalizeXUrl(draft.xUrl) ? "X link is invalid: use @handle or an x.com URL." : null;
  const webUrlError =
    draft.webUrl && !normalizeWebUrl(draft.webUrl) ? "Website URL is invalid." : null;
  const errors = [
    ...validateDraft(draft),
    ...(imageOk ? [] : ["image is invalid: upload a PNG/JPEG or use an https URL"]),
    ...(xUrlError ? [xUrlError] : []),
    ...(webUrlError ? [webUrlError] : []),
  ];
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
        <h3 className="m-0 text-lg font-bold font-unbounded whitespace-nowrap text-white">Launch Parameters</h3>
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
            className="mx-auto block h-48 w-48 cursor-pointer overflow-hidden rounded-full border border-white/15 p-0"
          >
            <ConceptLogo
              key={previewUrl ?? draft.image ?? ""}
              src={previewUrl ?? draft.image ?? ""}
              fallbackSrc={logoFallbackUrl(draft.ticker || "ARTEMIS", logoSeed)}
              alt={draft.name ? `${draft.name} artwork` : "Coin artwork preview"}
              className="h-48 w-48 rounded-full"
              onLoadingChange={setLogoLoading}
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
        ) : previewUrl || (draft.image && imageOk) ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Change artwork"
            aria-label="Change coin artwork"
            className="mx-auto block h-48 w-48 cursor-pointer overflow-hidden rounded-full border border-white/15 bg-black/20 p-0"
          >
            <ConceptLogo
              key={previewUrl ?? draft.image ?? ""}
              src={previewUrl ?? draft.image ?? ""}
              fallbackSrc={logoFallbackUrl(draft.ticker || "ARTEMIS", logoSeed)}
              alt={draft.name ? `${draft.name} artwork` : "Coin artwork preview"}
              className="h-48 w-48 rounded-full"
              onLoadingChange={setLogoLoading}
            />
          </button>
        ) : (
          <p className="m-0 rounded-lg border border-white/10 bg-[#1a1b1f] p-3 text-xs text-white/50">
            No artwork yet — upload a file, paste a URL, or hit Generate logo below.
          </p>
        )}
        <div className="font-unbounded text-[24px] font-bold leading-none text-[#fae8a4] max-sm:text-xl">
          {draft.ticker ? `$${draft.ticker}` : "$TICKER"}
        </div>
        {draft.tagline && (
          <p className="m-0 text-sm font-medium text-white/80 italic">{draft.tagline}</p>
        )}
        {draft.lore && (
          <p className="m-0 text-xs leading-relaxed whitespace-pre-line text-white/50">{draft.lore}</p>
        )}
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
          <span className="text-[11px] font-medium text-white/40">Optional · 1:1 · Max 2MB</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
        {pinning && (
          <p role="status" className="m-0 text-xs text-white/50">Pinning artwork to IPFS…</p>
        )}
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
                setDraft((prev) => ({ ...prev, image: undefined }));
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
        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
          <div className="flex flex-col gap-[5px]">
            <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="x-url">
              <span>X / Twitter</span>
              <span className="text-[11px] font-medium text-white/40">Optional</span>
            </label>
            <input
              id="x-url"
              className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
              placeholder="@handle or x.com/handle"
              value={draft.xUrl ?? ""}
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setDraft((prev) => ({ ...prev, xUrl: e.target.value || undefined }))}
            />
          </div>
          <div className="flex flex-col gap-[5px]">
            <label className="flex items-center justify-between text-xs font-bold tracking-[0.02em] text-white/90" htmlFor="web-url">
              <span>Website</span>
              <span className="text-[11px] font-medium text-white/40">Optional</span>
            </label>
            <input
              id="web-url"
              className="min-h-11 w-full rounded-lg border border-white/15 bg-[#1a1b1f] px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-[#fae8a4] focus:bg-[#1b1924]"
              placeholder="example.com"
              value={draft.webUrl ?? ""}
              maxLength={256}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setDraft((prev) => ({ ...prev, webUrl: e.target.value || undefined }))}
            />
          </div>
        </div>
        {(xUrlError ?? webUrlError) && (
          <p role="alert" className="m-0 text-xs font-medium text-red-300">
            {[xUrlError, webUrlError].filter(Boolean).join(" ")}
          </p>
        )}
        <ZkVerifyPanel
          onVerified={(handle) =>
            setDraft((prev) => ({ ...prev, xUrl: `https://x.com/${handle}` }))
          }
        />
        {previewUrl && !draft.image && (
          <p className="m-0 text-xs text-white/50">{pinning ? "Pinning artwork to IPFS…" : "Local preview — IPFS URL fills in after pin completes."}</p>
        )}
        {imageError && (
          <p role="alert" className="m-0 text-xs font-medium text-red-300">
            {imageError}
          </p>
        )}
        {draft.logoPrompt && (
          <div className="flex flex-col gap-2 rounded-lg border border-white/10 bg-[#1a1b1f] p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold tracking-wider text-white/50 uppercase">
                Logo prompt
              </span>
              <span className="flex items-center gap-1.5">
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noreferrer"
                  title="Open in Gemini (paste the prompt there)"
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <ExternalLink size={12} aria-hidden="true" />
                  <span>Gemini</span>
                </a>
                {draft.image && (
                  <button
                    type="button"
                    onClick={() => void downloadLogo(draft.image as string, `${(draft.ticker || "logo").replace(/[^A-Za-z0-9]/g, "")}-logo.png`)}
                    title="Download logo"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <Download size={12} aria-hidden="true" />
                    <span>Save</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const text = draft.logoPrompt ?? "";
                    if (typeof navigator === "undefined" || !navigator.clipboard) return;
                    void navigator.clipboard.writeText(text).then(
                      () => setLogoCopied(true),
                      () => setLogoCopied(false),
                    );
                    setTimeout(() => setLogoCopied(false), 1500);
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {logoCopied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  <span>{logoCopied ? "Copied" : "Copy"}</span>
                </button>
              </span>
            </div>
            <p className="m-0 font-mono text-xs leading-relaxed break-words text-white/70">{draft.logoPrompt}</p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={logoLoading}
                onClick={() => void forgeLogo(logoSeed)}
                className="inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#fae8a4] px-3 py-1.5 text-xs font-bold text-[#17131f] transition-all hover:bg-[#f1d2e8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles size={12} aria-hidden="true" />
                <span>{logoLoading ? "Forging…" : "Generate logo"}</span>
              </button>
              {draft.image && (
                <button
                  type="button"
                  disabled={logoLoading}
                  onClick={() => {
                    if (!draft.logoPrompt) return;
                    const seed = Math.floor(Math.random() * 1000000);
                    setLogoSeed(seed);
                    void forgeLogo(seed);
                  }}
                  className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>{logoLoading ? "Forging…" : "Redraw"}</span>
                </button>
              )}
            </div>
          </div>
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
      {cropSrc && (
        <CropModal
          src={cropSrc.url}
          fileName={cropSrc.name}
          fileType={cropSrc.type}
          onCancel={handleCropCancel}
          onDone={handleCropDone}
        />
      )}
    </section>
  );
}
