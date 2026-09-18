import { describe, expect, it } from "vitest";
import {
  detectEvm,
  detectSolana,
  EVM_WALLETS,
  loadWallet,
  SOLANA_WALLETS,
  withTimeout,
} from "../lib/wallets";

describe("wallet registry", () => {
  it("lists EVM options with install links", () => {
    expect(EVM_WALLETS.map((w) => w.id)).toEqual(["metamask", "rabby", "coinbase", "okx", "trust", "phantom"]);
    for (const w of EVM_WALLETS) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.installUrl).toMatch(/^https:\/\//);
    }
  });

  it("lists Solana options with install links", () => {
    expect(SOLANA_WALLETS.map((w) => w.id)).toEqual(["phantom", "solflare", "backpack", "nightly"]);
    for (const w of SOLANA_WALLETS) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.installUrl).toMatch(/^https:\/\//);
    }
  });

  it("detects nothing without a browser window", () => {
    expect(detectEvm("metamask")).toBeNull();
    expect(detectSolana("phantom")).toBeNull();
    expect(loadWallet()).toBeNull();
  });
});

describe("withTimeout", () => {
  it("resolves fast promises", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });

  it("rejects slow promises", async () => {
    await expect(withTimeout(new Promise(() => {}), 10)).rejects.toThrow("wallet_timeout");
  });
});
