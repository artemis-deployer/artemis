import { describe, expect, it } from "vitest";
import { buildMetadata, buildTradePayload, mapPumpError } from "../lib/launcher-solana";

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
