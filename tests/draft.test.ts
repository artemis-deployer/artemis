import { describe, expect, it } from "vitest";
import {
  applyAutoPatch,
  exceedsDirectSupply,
  parseDraftReply,
  resolveAutoPatch,
  shouldAutoApply,
  stripNumericSeparators,
  validateDraft,
} from "../lib/draft";
import { toTokenUnits } from "../lib/launcher-evm";
import { explorerTokenUrl, explorerTxUrl } from "../lib/chains";

describe("parseDraftReply", () => {
  it("extracts draft JSON embedded in prose", () => {
    const out = parseDraftReply('Sure! Here it is {"ticker":"ember","pooled":"800000"} done');
    expect(out.ticker).toBe("EMBER");
    expect(out.pooled).toBe("800000");
  });

  it("returns empty object when no JSON present", () => {
    expect(parseDraftReply("no json here")).toEqual({});
  });

  it("returns empty object on broken JSON", () => {
    expect(parseDraftReply('{"ticker":')).toEqual({});
  });

  it("extracts JSON from a fenced multi-block reply", () => {
    const reply = [
      "Nice idea! Here is a table:",
      "| Field | Value |",
      "|---|---|",
      "| Ticker | ARTS |",
      "",
      "```json",
      '{"name":"Community Canvas","ticker":"arts","pooled":"500000000","liquidity":"1.5","route":"pumpfun"}',
      "```",
      "Tell me if you want tweaks!",
    ].join("\n");
    expect(parseDraftReply(reply)).toEqual({
      name: "Community Canvas",
      ticker: "ARTS",
      pooled: "500000000",
      liquidity: "1.5",
      route: "pumpfun",
    });
  });

  it("prefers the last valid block when several exist", () => {
    expect(parseDraftReply('First {"ticker":"OLD"} then final {"ticker":"new","route":"direct"} ok')).toMatchObject({
      ticker: "NEW",
      route: "direct",
    });
  });

  it("ignores unknown keys such as image", () => {
    expect(parseDraftReply('{"ticker":"X","image":"https://x/y.png","foo":1}')).toEqual({ ticker: "X" });
  });

  it("accepts known chain ids from copilot patches", () => {
    expect(parseDraftReply('{"ticker":"X","chainId":4663}')).toMatchObject({ chainId: 4663 });
    expect(parseDraftReply('{"ticker":"X","chainId":"4663"}')).toMatchObject({ chainId: 4663 });
  });

  it("drops unknown chain ids", () => {
    expect(parseDraftReply('{"ticker":"X","chainId":999999}')).toEqual({ ticker: "X" });
    expect(parseDraftReply('{"ticker":"X","chainId":"nope"}')).toEqual({ ticker: "X" });
  });

  it("parks Solana chain ids (coming soon)", () => {
    expect(parseDraftReply('{"ticker":"X","chainId":"solana-devnet"}')).toEqual({ ticker: "X" });
    expect(parseDraftReply('{"ticker":"X","chainId":"solana-mainnet"}')).toEqual({ ticker: "X" });
  });
});

describe("shouldAutoApply", () => {
  it("returns false for empty patches", () => {
    expect(shouldAutoApply({})).toBe(false);
  });

  it("returns true when patch carries fields", () => {
    expect(shouldAutoApply({ ticker: "X" })).toBe(true);
    expect(shouldAutoApply({ chainId: 4663 })).toBe(true);
  });
});

describe("applyAutoPatch", () => {
  it("merges patch over prev and keeps snapshot for undo", () => {
    const prev = {
      name: "Old",
      ticker: "OLD",
      pooled: "1",
      liquidity: "1",
      route: "direct" as const,
      chainId: 46630,
    };
    const { next, prevSnapshot } = applyAutoPatch(prev, { ticker: "NEW", chainId: 4663 });
    expect(next).toMatchObject({ name: "Old", ticker: "NEW", chainId: 4663 });
    expect(prevSnapshot).toEqual(prev);
    expect(prevSnapshot).not.toBe(prev);
  });

  it("restoring snapshot undoes auto-apply", () => {
    const prev = {
      name: "Old",
      ticker: "OLD",
      pooled: "1",
      liquidity: "1",
      route: "direct" as const,
      chainId: 46630,
    };
    const { next, prevSnapshot } = applyAutoPatch(prev, { ticker: "NEW" });
    expect(next.ticker).toBe("NEW");
    expect(prevSnapshot.ticker).toBe("OLD");
  });
});

describe("validateDraft", () => {
  it("requires ticker", () => {
    expect(validateDraft({})).toContain("ticker is required");
  });

  it("rejects non-positive numbers", () => {
    expect(validateDraft({ ticker: "X", pooled: "-5" })).toContain("pooled must be a positive number");
    expect(validateDraft({ ticker: "X", liquidity: "abc" })).toContain("liquidity must be a positive number");
  });

  it("accepts a good draft", () => {
    expect(validateDraft({ ticker: "EMBER", pooled: "800000", liquidity: "0.1" })).toEqual([]);
  });

  it("requires pooled and liquidity for direct launches", () => {
    expect(validateDraft({ ticker: "X", route: "direct" })).toContain("pooled is required");
    expect(validateDraft({ ticker: "X", route: "direct" })).toContain("liquidity is required");
  });

  it("requires only liquidity for pumpfun launches", () => {
    expect(validateDraft({ ticker: "X", route: "pumpfun", liquidity: "1" })).toEqual([]);
    expect(validateDraft({ ticker: "X", route: "pumpfun", pooled: "", liquidity: "" })).toContain(
      "liquidity is required",
    );
  });

  it("rejects pooled above fixed direct supply", () => {
    expect(validateDraft({ ticker: "X", route: "direct", pooled: "999000001", liquidity: "1" })).toContain(
      "pooled exceeds fixed supply",
    );
    expect(validateDraft({ ticker: "X", route: "direct", pooled: "999000000", liquidity: "1" })).toEqual([]);
  });

  it("rejects dust over supply that Number rounds away (toTokenUnits parity)", () => {
    expect(
      validateDraft({ ticker: "X", route: "direct", pooled: "999000000.0000000001", liquidity: "1" }),
    ).toContain("pooled exceeds fixed supply");
    expect(
      validateDraft({ ticker: "X", route: "direct", pooled: "999000000.0", liquidity: "1" }),
    ).toEqual([]);
  });

  it("blocks every toTokenUnits throw: commas, dots, zero, negative, huge", () => {
    for (const bad of ["1,000", "1.2.3", ".", "0", "-5", "0.0000000000000000001"]) {
      expect(validateDraft({ ticker: "X", pooled: bad, liquidity: "1", route: "direct" }).length).toBeGreaterThan(0);
      expect(validateDraft({ ticker: "X", pooled: "1", liquidity: bad, route: "direct" }).length).toBeGreaterThan(0);
    }
    expect(validateDraft({ ticker: "X", pooled: "1,000", liquidity: "0.5", route: "direct" }).length).toBeGreaterThan(0);
  });

  it("rejects whitespace-only ticker", () => {
    expect(validateDraft({ ticker: "   ", pooled: "1", liquidity: "1", route: "direct" })).toContain(
      "ticker is required",
    );
  });

  it("rejects non-decimal numeric strings that token units refuse", () => {
    for (const bad of ["Infinity", "0x10", "1e3"]) {
      expect(validateDraft({ ticker: "X", pooled: bad, liquidity: "1", route: "direct" })).toContain(
        "pooled must be a positive number",
      );
      expect(validateDraft({ ticker: "X", pooled: "1", liquidity: bad, route: "direct" })).toContain(
        "liquidity must be a positive number",
      );
    }
  });

  it("rejects zero pooled and zero liquidity", () => {
    expect(validateDraft({ ticker: "X", pooled: "0", liquidity: "1", route: "direct" })).toContain(
      "pooled must be a positive number",
    );
    expect(validateDraft({ ticker: "X", pooled: "1", liquidity: "0", route: "direct" })).toContain(
      "liquidity must be a positive number",
    );
  });

  it("rejects dust with more than 18 decimals that parseEther truncates to zero", () => {
    expect(
      validateDraft({ ticker: "X", pooled: "0.0000000000000000001", liquidity: "1", route: "direct" }),
    ).toContain("pooled must be a positive number");
    expect(
      validateDraft({ ticker: "X", pooled: "1", liquidity: "0.0000000000000000001", route: "direct" }),
    ).toContain("liquidity must be a positive number");
  });

  it("accepts 18-decimal wei dust", () => {
    expect(
      validateDraft({ ticker: "X", pooled: "0.000000000000000001", liquidity: "1", route: "direct" }),
    ).toEqual([]);
  });

  it("requires pooled when pumpfun route sits on an EVM chain (dialog runs EVM rail)", () => {
    expect(validateDraft({ ticker: "X", route: "pumpfun", chainId: 4663, liquidity: "1" })).toContain(
      "pooled is required",
    );
  });

  it("keeps pooled optional for pumpfun on solana", () => {
    expect(validateDraft({ ticker: "X", route: "pumpfun", chainId: "solana-devnet", liquidity: "1" })).toEqual(
      [],
    );
  });

  it("strips thousand separators from copilot pooled/liquidity", () => {
    expect(parseDraftReply('{"ticker":"X","pooled":"500,000","liquidity":"0. 5"}')).toMatchObject({
      pooled: "500000",
      liquidity: "0.5",
    });
  });

  it("trims name like server validation (leading spaces parity)", () => {
    expect(parseDraftReply('{"name":"  Arts Club  ","ticker":"X"}')).toMatchObject({ name: "Arts Club" });
  });

  it("drops whitespace-only name like server (no empty patch)", () => {
    expect(parseDraftReply('{"name":"   ","ticker":"X"}')).toEqual({ ticker: "X" });
  });

  it("documents rapid-reply undo: second snapshot is immediate prev by design", () => {
    const base = {
      name: "Old",
      ticker: "OLD",
      pooled: "1",
      liquidity: "1",
      route: "direct" as const,
      chainId: 46630,
    };
    const first = resolveAutoPatch(base, { ticker: "FIRST" }, null);
    const second = resolveAutoPatch(first!.next, { ticker: "SECOND" }, null);
    expect(second?.prevSnapshot.ticker).toBe("FIRST");
    expect(second?.next.ticker).toBe("SECOND");
  });
});

describe("resolveAutoPatch", () => {
  const base = {
    name: "Old",
    ticker: "OLD",
    pooled: "1",
    liquidity: "1",
    route: "direct" as const,
    chainId: 46630,
  };

  it("merges over latest and keeps snapshot for undo", () => {
    const r = resolveAutoPatch(base, { ticker: "NEW" }, null);
    expect(r?.next.ticker).toBe("NEW");
    expect(r?.prevSnapshot).toEqual(base);
  });

  it("drops only the focused field, keeps rest", () => {
    const r = resolveAutoPatch(base, { ticker: "NEW", pooled: "5" }, "token-ticker");
    expect(r?.next.ticker).toBe("OLD");
    expect(r?.next.pooled).toBe("5");
  });

  it("returns null when focused field was the only key", () => {
    expect(resolveAutoPatch(base, { ticker: "NEW" }, "token-ticker")).toBeNull();
  });

  it("ignores chat input focus (no draft key)", () => {
    const r = resolveAutoPatch(base, { ticker: "NEW" }, "chat-input");
    expect(r?.next.ticker).toBe("NEW");
  });

  it("returns null for empty patch", () => {
    expect(resolveAutoPatch(base, {}, null)).toBeNull();
  });
});

describe("stripNumericSeparators", () => {
  it("removes commas and whitespace, keeps digits and dot", () => {
    expect(stripNumericSeparators("1,000 000")).toBe("1000000");
    expect(stripNumericSeparators(" 0.5 ")).toBe("0.5");
  });

  it("keeps underscores so strict validators reject them", () => {
    expect(stripNumericSeparators("1_000")).toBe("1_000");
  });
});

describe("numeric-precision warfare: supply boundary", () => {
  const good = (pooled: string) =>
    validateDraft({ ticker: "X", route: "direct", pooled, liquidity: "1" });
  it("accepts exact supply", () => {
    expect(good("999000000")).toEqual([]);
    expect(exceedsDirectSupply("999000000")).toBe(false);
  });
  it("rejects 12-decimal dust over supply", () => {
    expect(good("999000000.000000000001")).toContain("pooled exceeds fixed supply");
    expect(exceedsDirectSupply("999000000.000000000001")).toBe(true);
  });
  it("rejects .5 over supply", () => {
    expect(good("999000000.5")).toContain("pooled exceeds fixed supply");
  });
  it("rejects 19-decimal dust, accepts 18-decimal 1-wei dust", () => {
    expect(good("0.0000000000000000001")).toContain("pooled must be a positive number");
    expect(good("0.000000000000000001")).toEqual([]);
    expect(toTokenUnits("0.000000000000000001")).toBe(1n);
  });
});

describe("numeric-precision warfare: strict shape parity", () => {
  const badBoth = (v: string) => {
    expect(
      validateDraft({ ticker: "X", pooled: v, liquidity: "1", route: "direct" }).length,
    ).toBeGreaterThan(0);
    expect(
      validateDraft({ ticker: "X", pooled: "1", liquidity: v, route: "direct" }).length,
    ).toBeGreaterThan(0);
  };
  it("rejects underscore, multi-dot, leading/trailing dot", () => {
    for (const bad of ["1_000", "1.2.3", ".5", "5."]) badBoth(bad);
  });
});

describe("explorer urls", () => {
  it("points solana-devnet links at path with cluster param", () => {
    expect(explorerTokenUrl("solana-devnet", "MINT")).toBe("https://solscan.io/token/MINT?cluster=devnet");
    expect(explorerTxUrl("solana-devnet", "SIG")).toBe("https://solscan.io/tx/SIG?cluster=devnet");
  });

  it("keeps mainnet and EVM explorer shapes", () => {
    expect(explorerTokenUrl("solana-mainnet", "MINT")).toBe("https://solscan.io/token/MINT");
    expect(explorerTokenUrl(46630, "0xabc")).toBe(
      "https://explorer.testnet.chain.robinhood.com/address/0xabc",
    );
    expect(explorerTxUrl(4663, "0xhash")).toBe("https://robinhoodchain.blockscout.com/tx/0xhash");
  });
});
