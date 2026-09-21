import { describe, expect, it } from "vitest";
import {
  findNewCompletion,
  imageOkForDraft,
  isSafeImageSrc,
  resetLaunchAmounts,
} from "../components/DraftContext";
import type { Receipt } from "../lib/receipts";

const DRAFT = {
  name: "Artemis Spark",
  ticker: "SPARK",
  pooled: "500000000",
  liquidity: "0.5",
  route: "direct" as const,
  chainId: 46630,
  image: "data:image/jpeg;base64,/9j/",
};

function receipt(over: Partial<Receipt> = {}): Receipt {
  return {
    chainId: 4663,
    token: "0x097716e767df17605627def0030110f8ee559ec4",
    hash: "0xabc",
    createdAt: new Date().toISOString(),
    ticker: "SPARK",
    ...over,
  };
}

describe("resetLaunchAmounts", () => {
  it("clears pooled/liquidity but keeps identity fields", () => {
    expect(resetLaunchAmounts(DRAFT)).toEqual({ ...DRAFT, pooled: "", liquidity: "" });
  });
});

describe("findNewCompletion", () => {
  it("detects EVM pool-done receipts saved after the dialog opened", () => {
    const openedAt = Date.now() - 1000;
    expect(findNewCompletion(openedAt, "SPARK", [receipt({ pool: "0xpool" })])).toBe(true);
  });

  it("ignores token-only receipts so step-2 resume keeps its inputs", () => {
    const openedAt = Date.now() - 1000;
    expect(findNewCompletion(openedAt, "SPARK", [receipt()])).toBe(false);
  });

  it("detects Solana sends (token, no pool field)", () => {
    const openedAt = Date.now() - 1000;
    const r = receipt({ chainId: "solana-mainnet", token: "9bVt7TN2D6PD9y3B5G6g3Mxfh22TLawkKSJQpPTRhxmX" });
    expect(findNewCompletion(openedAt, "SPARK", [r])).toBe(true);
  });

  it("ignores receipts older than the dialog open and ticker mismatches", () => {
    const old = receipt({ pool: "0xpool", createdAt: new Date(Date.now() - 60000).toISOString() });
    expect(findNewCompletion(Date.now(), "SPARK", [old])).toBe(false);
    const fresh = receipt({ pool: "0xpool" });
    expect(findNewCompletion(Date.now() - 1000, "OTHER", [fresh])).toBe(false);
  });
});

describe("isSafeImageSrc", () => {
  it("allows empty (optional) and small uploaded data URLs", () => {
    expect(isSafeImageSrc(undefined)).toBe(true);
    expect(isSafeImageSrc("data:image/jpeg;base64,/9j/4AAQ")).toBe(true);
    expect(isSafeImageSrc("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
  });

  it("rejects non-image data URLs and oversized payloads", () => {
    expect(isSafeImageSrc("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeImageSrc(`data:image/png;base64,${"A".repeat(600000)}`)).toBe(false);
  });

  it("allows https URLs with a length cap, rejects http/javascript", () => {
    expect(isSafeImageSrc("https://example.com/img.png")).toBe(true);
    expect(isSafeImageSrc("http://example.com/img.png")).toBe(false);
    expect(isSafeImageSrc("javascript:alert(1)")).toBe(false);
    expect(isSafeImageSrc(`https://example.com/${"a".repeat(3000)}`)).toBe(false);
  });
});

describe("imageOkForDraft", () => {
  it("skips validation on EVM so bad image never blocks Review", () => {
    expect(imageOkForDraft({ route: "direct", chainId: 4663, image: "javascript:alert(1)" })).toBe(true);
    expect(imageOkForDraft({ route: "direct", chainId: 46630, image: "data:text/html,x" })).toBe(true);
    expect(imageOkForDraft({ route: "pumpfun", chainId: 4663, image: "javascript:alert(1)" })).toBe(true);
  });

  it("enforces validation on Solana so invalid blocks Review", () => {
    expect(imageOkForDraft({ route: "pumpfun", chainId: "solana-mainnet", image: "javascript:alert(1)" })).toBe(false);
    expect(imageOkForDraft({ route: "pumpfun", chainId: "solana-devnet", image: "data:text/html,x" })).toBe(false);
    expect(imageOkForDraft({ route: "pumpfun", chainId: "solana-mainnet", image: "https://example.com/a.png" })).toBe(true);
    expect(imageOkForDraft({ route: "pumpfun", chainId: "solana-mainnet", image: undefined })).toBe(true);
  });
});
