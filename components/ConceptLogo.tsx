"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Pollinations anonymous tier 429s under load: wait out the window, then try
// the flux model before giving up to the DiceBear fallback.
const RETRY_DELAY_MS = 4000;

type Props = {
  src: string;
  fallbackSrc: string;
  alt: string;
  className?: string;
  /** Lets parents disable redraw buttons while art is still loading (anti-spam). */
  onLoadingChange?: (loading: boolean) => void;
};

/**
 * Download artwork to disk (fetch → blob → anchor). Falls back to opening
 * the URL when fetch fails (remote CORS) or no DOM is available.
 */
export async function downloadLogo(url: string, filename: string): Promise<boolean> {
  if (typeof document === "undefined" || !url) return false;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("download_failed");
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 5000);
    return true;
  } catch {
    window.open(url, "_blank", "noopener");
    return false;
  }
}

/**
 * Logo image with MorphX-style forging state: shimmer + spinner overlay
 * until the artwork loads, one-shot fallback when the source fails.
 * Remount per src (parent passes key={src}) so redraws replay the animation.
 */
export default function ConceptLogo({ src, fallbackSrc, alt, className, onLoadingChange }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [finalSrc, setFinalSrc] = useState(src);
  // 0 = primary, 1 = delayed retry of primary, 2 = flux variant, 3 = fallback.
  const [stage, setStage] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Report loading start on mount (remounts per src, so redraws re-lock).
  useEffect(() => void onLoadingChange?.(true), [onLoadingChange]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function fluxVariant(url: string): string | null {
    if (!url.includes("image.pollinations.ai") || !url.includes("model=turbo")) return null;
    return url.replace("model=turbo", "model=flux");
  }

  function done() {
    if (timer.current) clearTimeout(timer.current);
    setLoaded(true);
    onLoadingChange?.(false);
  }

  function nextStep(img: HTMLImageElement) {
    if (stage === 0) {
      // Transient 429/500: wait out the rate window, reload same URL.
      setStage(1);
      timer.current = setTimeout(() => {
        img.src = src;
      }, RETRY_DELAY_MS);
    } else if (stage === 1) {
      const flux = fluxVariant(src);
      setStage(2);
      if (flux) setFinalSrc(flux);
      else {
        img.dataset.fb = "1";
        setFinalSrc(fallbackSrc);
        setStage(3);
      }
    } else {
      // Fallback failed too: stop, never loop.
      done();
    }
  }

  return (
    <span className={`relative block overflow-hidden ${className ?? ""}`}>
      {!loaded && (
        <span aria-hidden="true" className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/10 via-white/5 to-transparent" />
      )}
      {!loaded && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
          <Loader2 size={22} aria-hidden="true" className="animate-spin text-[#fae8a4]" />
          <span className="font-mono text-[10px] font-bold tracking-wider text-white/70 uppercase">Forging logo…</span>
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- generated or user artwork with fallback */}
      <img
        src={finalSrc}
        alt={alt}
        loading="lazy"
        onLoad={done}
        onError={(e) => {
          const el = e.currentTarget;
          if (el.dataset.fb === "1") {
            done();
            return;
          }
          nextStep(el);
        }}
        className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  );
}
