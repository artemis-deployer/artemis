import { describe, expect, it, vi, afterEach } from "vitest";
import {
  connectSolana,
  detectEvm,
  detectSolana,
  EVM_WALLETS,
  formatWei,
  getEvmBalance,
  getEvmChainId,
  getSolanaBalance,
  isInsufficientFunds,
  loadWallet,
  SOLANA_WALLETS,
  solanaAddressOf,
  withTimeout,
} from "../lib/wallets";

describe("wallet registry", () => {
  it("lists EVM options with install links", () => {
    expect(EVM_WALLETS.map((w) => w.id)).toEqual(["metamask", "rabby", "coinbase", "okx", "trust", "phantom"]);
    for (const w of EVM_WALLETS) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.installUrl).toMatch(/^https:\/\//);
      expect(w.icon).toMatch(/^\/wallets\/.+\.(svg|png)$/);
    }
  });

  it("lists Solana options with install links", () => {
    expect(SOLANA_WALLETS.map((w) => w.id)).toEqual(["phantom", "solflare", "backpack", "nightly"]);
    for (const w of SOLANA_WALLETS) {
      expect(w.name.length).toBeGreaterThan(0);
      expect(w.installUrl).toMatch(/^https:\/\//);
      expect(w.icon).toMatch(/^\/wallets\/.+\.(svg|png)$/);
    }
  });

  it("detects nothing without a browser window", () => {
    expect(detectEvm("metamask")).toBeNull();
    expect(detectSolana("phantom")).toBeNull();
    expect(loadWallet()).toBeNull();
  });

  it("detects Phantom pre-connect when publicKey is still null", () => {
    vi.stubGlobal("window", { phantom: { solana: { connect: async () => undefined, publicKey: null } } });
    try {
      expect(detectSolana("phantom")).not.toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects providers without connect", () => {
    vi.stubGlobal("window", { phantom: { solana: { publicKey: null } } });
    try {
      expect(detectSolana("phantom")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("formats wei compactly", () => {
    expect(formatWei(1000000000000000000n)).toBe("1");
    expect(formatWei(1234500000000000000n)).toBe("1.2345");
    expect(formatWei(0n)).toBe("0");
  });

  it("never renders nonzero dust as zero", () => {
    expect(formatWei(1n)).not.toBe("0");
    expect(formatWei(99999999999999n)).not.toBe("0");
  });

  it("table: zero, dust, thousand, huge", () => {
    expect(formatWei(0n)).toBe("0");
    expect(formatWei(1n)).toBe("<0.0001");
    expect(formatWei(99999999999999n)).toBe("<0.0001");
    expect(formatWei(1000n * 10n ** 18n)).toBe("1000");
    expect(formatWei(10n ** 30n)).toBe("1000000000000");
  });

  it("reads chain id hex or null", async () => {
    const ok = { request: async () => "0x122B" } as never;
    await expect(getEvmChainId(ok)).resolves.toBe(4651);
    const bad = { request: async () => { throw new Error("x"); } } as never;
    await expect(getEvmChainId(bad)).resolves.toBeNull();
  });

  it("rejects non-string chainId (number input never misparsed)", async () => {
    const num = { request: async () => 4663 } as never;
    await expect(getEvmChainId(num)).resolves.toBeNull();
    const empty = { request: async () => "0x" } as never;
    await expect(getEvmChainId(empty)).resolves.toBeNull();
    const nil = { request: async () => null } as never;
    await expect(getEvmChainId(nil)).resolves.toBeNull();
  });

  it("formats negative wei with sign (never malformed)", () => {
    expect(formatWei(-1500000000000000000n)).toBe("-1.5");
    expect(formatWei(-1000000000000000000n)).toBe("-1");
  });
});

describe("loadWallet", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage(initial: Record<string, string> = {}) {
    const map = new Map(Object.entries(initial));
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    });
  }

  const EVM_ADDR = "0x097716e767df17605627def0030110f8ee559ec4";
  const SOL_ADDR = "9bVt7TN2D6PD9y3B5G6g3Mxfh22TLawkKSJQpPTRhxmX";

  it("accepts well-formed stored wallets", () => {
    stubStorage({
      "artemis.wallet.v1": JSON.stringify({ kind: "evm", id: "metamask", address: EVM_ADDR }),
    });
    expect(loadWallet()).toEqual({ kind: "evm", id: "metamask", address: EVM_ADDR });
  });

  it("rejects poisoned storage: bad address, cross-kind address, unknown id", () => {
    for (const stored of [
      { kind: "evm", id: "metamask", address: "evil" },
      { kind: "evm", id: "metamask", address: SOL_ADDR },
      { kind: "solana", id: "phantom", address: EVM_ADDR },
      { kind: "evm", id: "evilwallet", address: EVM_ADDR },
      { kind: "solana", id: "phantom", address: "" },
    ]) {
      stubStorage({ "artemis.wallet.v1": JSON.stringify(stored) });
      expect(loadWallet()).toBeNull();
    }
  });
});

describe("solanaAddressOf", () => {
  it("returns null for connect-only providers with null publicKey", () => {
    expect(solanaAddressOf({ connect: async () => undefined, publicKey: null })).toBeNull();
  });

  it("returns base58 when connected", () => {
    expect(
      solanaAddressOf({ connect: async () => undefined, publicKey: { toBase58: () => "9bVt7TN2D6PD9y3B5G6g3Mxfh22TLawkKSJQpPTRhxmX" } }),
    ).toBe("9bVt7TN2D6PD9y3B5G6g3Mxfh22TLawkKSJQpPTRhxmX");
  });

  it("returns null when toBase58 throws or provider missing", () => {
    expect(
      solanaAddressOf({
        connect: async () => undefined,
        publicKey: { toBase58: () => { throw new Error("locked"); } },
      }),
    ).toBeNull();
    expect(solanaAddressOf(null)).toBeNull();
    expect(solanaAddressOf(undefined)).toBeNull();
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

  it("returns null when balance is non-string", async () => {
    const provider = { request: vi.fn().mockResolvedValue(12345) };
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

  it("bounds Solana RPC calls with an abort signal", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ result: { value: 1000000000 } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getSolanaBalance("addr")).resolves.toBe("1");
    const init = fetchMock.mock.calls[0][1] as { signal?: unknown };
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("never renders nonzero lamport dust as zero", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { value: 1 } }))),
    );
    await expect(getSolanaBalance("addr")).resolves.not.toBe("0");
  });

  it("table: zero, dust, thousand, huge", async () => {
    const bal = async (lamports: number) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: { value: lamports } }))),
      );
      return getSolanaBalance("addr");
    };
    await expect(bal(0)).resolves.toBe("0");
    await expect(bal(1)).resolves.toBe("<0.0001");
    await expect(bal(1000000000)).resolves.toBe("1");
    await expect(bal(1000000000000)).resolves.toBe("1,000");
    await expect(bal(1e15)).resolves.toBe("1,000,000");
  });

  it("retries transient Solana RPC failures", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("429"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { value: 2500000000 } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getSolanaBalance("addr")).resolves.toBe("2.5");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls through to backup RPC endpoints", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockRejectedValueOnce(new Error("down"))
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { value: 1000000000 } })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getSolanaBalance("addr", ["https://a.test", "https://b.test"])).resolves.toBe("1");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect((fetchMock.mock.calls[3] as [string])[0]).toBe("https://b.test");
  });

  it("rejects connect when publicKey stays null post-connect", async () => {
    vi.stubGlobal("window", {
      phantom: { solana: { connect: async () => undefined, publicKey: null } },
    });
    await expect(connectSolana("phantom")).rejects.toThrow("wallet_failed");
  });
});

describe("isInsufficientFunds", () => {
  it("returns false when balance or total unknown", () => {
    expect(isInsufficientFunds(null, 10n)).toBe(false);
    expect(isInsufficientFunds(10n, null)).toBe(false);
  });

  it("warns when total exceeds balance", () => {
    expect(isInsufficientFunds(100n, 101n)).toBe(true);
    expect(isInsufficientFunds(100n, 100n)).toBe(false);
    expect(isInsufficientFunds(100n, 50n)).toBe(false);
  });
});
