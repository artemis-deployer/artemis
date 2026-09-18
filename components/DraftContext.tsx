"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import { EMPTY_DRAFT, type Draft } from "../lib/draft";
import type { Receipt } from "../lib/receipts";

const IMAGE_DATA_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_DATA_LEN = 500000;
const MAX_IMAGE_URL_LEN = 2048;

/** Upload path downscales, but copilot patches can inject any string. */
export function isSafeImageSrc(src: string | undefined): boolean {
  if (!src) return true;
  if (src.length > MAX_IMAGE_DATA_LEN) return false;
  if (src.startsWith("data:")) return IMAGE_DATA_RE.test(src);
  return src.startsWith("https://") && src.length <= MAX_IMAGE_URL_LEN && !/\s/.test(src);
}

/** Keep identity fields, drop amounts so a reopened dialog can't double-launch. */
export function resetLaunchAmounts(d: Draft): Draft {
  return { ...d, pooled: "", liquidity: "" };
}

/** Receipts lack status; an EVM pool hash (or Solana token) saved after open = done. */
export function findNewCompletion(openedAtMs: number, ticker: string, receipts: Receipt[]): boolean {
  const want = ticker.toUpperCase();
  return receipts.some((r) => {
    if ((r.ticker ?? "").toUpperCase() !== want) return false;
    const created = Date.parse(r.createdAt);
    if (!Number.isFinite(created) || created < openedAtMs - 1000) return false;
    if (r.pool) return true;
    return String(r.chainId).startsWith("solana") && typeof r.token === "string" && r.token.length > 0;
  });
}

const DraftCtx = createContext<{
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  consent: boolean;
  setConsent: (b: boolean) => void;
}>({
  draft: EMPTY_DRAFT,
  setDraft: () => undefined,
  consent: false,
  setConsent: () => undefined,
});

export function DraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [consent, setConsent] = useState(false);
  return <DraftCtx.Provider value={{ draft, setDraft, consent, setConsent }}>{children}</DraftCtx.Provider>;
}

export function useDraft() {
  return useContext(DraftCtx);
}
