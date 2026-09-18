import { describe, expect, it, vi, afterEach } from "vitest";
import {
  detectEvm,
  detectSolana,
  EVM_WALLETS,
  getEvmBalance,
  getSolanaBalance,
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
      expect(w.icon).toMatch(/^\/wallets\/.+\.svg$/);
    }
  });

  it("lists Solana options with install links", () => {
    expect(SOLANA_WALLETS.map((w) => w.id)).toEqual(["phantom", "solflare", "backpack", "nightly"]);
    for (const w of SOLANA_WALLETS) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.installUrl).toMatch(/^https:\/\//);
      expect(w.icon).toMatch(/^\/wallets\/.+\.svg$/);
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

describe("balances", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("formats EVM wei to ether", async () => {
    const provider = { request: vi.fn().mockResolvedValue("0x14d1120d7b160000") };
    await expect(getEvmBalance(provider, "0xabc")).resolves.toBe("1.5");
  });

  it("returns null when the EVM provider throws", async () => {
    const provider = { request: vi.fn().mockRejectedValue(new Error("down")) };
    await expect(getEvmBalance(provider, "0xabc")).resolves.toBeNull();
  });

  it("parses Solana getBalance lamports", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { value: 2500000000 } }))),
    );
    await expect(getSolanaBalance("addr")).resolves.toBe("2.5");
  });

  it("returns null when Solana RPC fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await expect(getSolanaBalance("addr")).resolves.toBeNull();
  });
});
