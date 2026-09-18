import { describe, expect, it } from "vitest";
import { CHAINS, DIRECT_SUPPLY, getChain } from "../lib/chains";

describe("chains", () => {
  it("finds Hood mainnet by id", () => {
    expect(getChain(4663)?.name).toBe("Robinhood Chain");
  });

  it("returns undefined for unknown chain", () => {
    expect(getChain(999999)).toBeUndefined();
  });

  it("coerces numeric strings from database rows", () => {
    expect(getChain("4663")?.name).toBe("Robinhood Chain");
    expect(getChain("solana-mainnet")?.name).toBe("Solana");
  });

  it("pins direct supply", () => {
    expect(DIRECT_SUPPLY).toBe(999000000);
    expect(CHAINS.length).toBe(4);
  });

  it("returns undefined for blank, padded, or fractional ids", () => {
    expect(getChain("")).toBeUndefined();
    expect(getChain(" 4663 ")).toBeUndefined();
    expect(getChain("4663.0")).toBeUndefined();
    expect(getChain(4663.5)).toBeUndefined();
  });

  it("labels every chain with a currency and https explorer", () => {
    for (const c of CHAINS) {
      expect(c.currency.length).toBeGreaterThan(0);
      expect(c.explorer).toMatch(/^https:\/\//);
    }
  });
});
