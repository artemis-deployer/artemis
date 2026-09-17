import { describe, expect, it } from "vitest";
import { CHAINS, DIRECT_SUPPLY, getChain } from "../lib/chains";

describe("chains", () => {
  it("finds Hood mainnet by id", () => {
    expect(getChain(4663)?.name).toBe("Robinhood Chain");
  });

  it("returns undefined for unknown chain", () => {
    expect(getChain(999999)).toBeUndefined();
  });

  it("pins direct supply", () => {
    expect(DIRECT_SUPPLY).toBe(999000000);
    expect(CHAINS.length).toBe(4);
  });
});
