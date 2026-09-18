import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCreateTx,
  buildMetadata,
  buildTradePayload,
  inspectTxSize,
  mapPumpError,
  PUMP_FEE_SOL,
  PUMP_POOL,
  PUMP_PRIORITY_FEE,
  PUMP_SLIPPAGE,
  uploadMetadata,
  validateTxBytes,
} from "../lib/launcher-solana";

describe("buildMetadata", () => {
  it("builds pump metadata json", () => {
    const m = buildMetadata({ name: "Kopi", symbol: "KOPI", description: "d" });
    expect(m).toMatchObject({ name: "Kopi", symbol: "KOPI", description: "d" });
  });

  it("rejects blank name or symbol", () => {
    expect(() => buildMetadata({ name: "", symbol: "X", description: "" })).toThrow();
    expect(() => buildMetadata({ name: "X", symbol: "", description: "" })).toThrow();
  });
});

describe("buildTradePayload", () => {
  it("shapes a create payload for trade-local", () => {
    const p = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    expect(p).toMatchObject({ action: "create", pool: "pump", denominatedInSol: "true" });
    expect(p.slippage).toBeGreaterThan(0);
  });
});

describe("mapPumpError", () => {
  it("maps network failure to offline", () => {
    expect(mapPumpError(new Error("fetch failed"))).toBe("pump_offline");
  });

  it("passes through explicit codes", () => {
    expect(mapPumpError(new Error("pump_rejected: nope"))).toBe("pump_rejected: nope");
  });
});

describe("pump constants", () => {
  it("exports expected values", () => {
    expect(PUMP_SLIPPAGE).toBe(10);
    expect(PUMP_PRIORITY_FEE).toBe(0.0005);
    expect(PUMP_POOL).toBe("pump");
    expect(PUMP_FEE_SOL).toBe(0.02);
  });

  it("uses constants in trade payload", () => {
    const p = buildTradePayload({
      publicKey: "11111111111111111111111111111111",
      mint: "22222222222222222222222222222222222222222222",
      name: "Kopi",
      symbol: "KOPI",
      uri: "https://example.test/m.json",
      amountSol: 0.1,
    });
    expect(p.slippage).toBe(PUMP_SLIPPAGE);
    expect(p.priorityFee).toBe(PUMP_PRIORITY_FEE);
    expect(p.pool).toBe(PUMP_POOL);
  });
});

describe("inspectTxSize", () => {
  it("decodes valid base64 to byte length", () => {
    expect(inspectTxSize("aGk=")).toBe(2);
  });

  it("throws on invalid input", () => {
    expect(() => inspectTxSize("!!!")).toThrow("pump_rejected: bad tx bytes");
  });
});

describe("validateTxBytes", () => {
  it("throws on empty serialize output", () => {
    const tx = { serialize: () => new Uint8Array(0), message: { accountKeys: ["k"] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateTxBytes(tx as any)).toThrow("pump_rejected: empty tx bytes");
  });

  it("throws on empty account keys", () => {
    const tx = { serialize: () => new Uint8Array([1, 2]), message: { accountKeys: [] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateTxBytes(tx as any)).toThrow("pump_rejected: empty tx bytes");
  });

  it("passes for non-empty tx if constructible else skips", () => {
    const tx = { serialize: () => new Uint8Array([1, 2]), message: { accountKeys: ["k"] } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => validateTxBytes(tx as any)).not.toThrow();
  });
});

describe("pump network retry", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploadMetadata retries once then throws pump_offline", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" })).rejects.toThrow(
      "pump_offline",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("uploadMetadata succeeds on retry", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ metadataUri: "https://example.test/m.json" }),
      });
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      uploadMetadata({ name: "Kopi", symbol: "KOPI", description: "d" }),
    ).resolves.toBe("https://example.test/m.json");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("buildCreateTx retries once then throws pump_offline", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      buildCreateTx({ publicKey: "p", action: "create" }),
    ).rejects.toThrow("pump_offline");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
