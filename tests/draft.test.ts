import { describe, expect, it } from "vitest";
import { parseDraftReply, validateDraft } from "../lib/draft";

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
});
