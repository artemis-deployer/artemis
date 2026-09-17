import { describe, expect, it } from "vitest";
import { TOKEN_ABI, TOKEN_BYTECODE, TOKEN_SOLC_VERSION } from "../lib/token-artifact";

describe("token artifact", () => {
  it("pins the compiler version", () => {
    expect(TOKEN_SOLC_VERSION).toBe("0.8.26");
  });

  it("exposes a constructor with name, symbol, supply", () => {
    const ctor = (TOKEN_ABI as unknown as { type: string; inputs: { name: string }[] }[]).find((e) => e.type === "constructor");
    expect(ctor?.inputs.map((i) => i.name)).toEqual(["n", "s", "supply"]);
  });

  it("exposes transfer, approve, transferFrom", () => {
    const names = (TOKEN_ABI as unknown as { type: string; name: string }[]).filter((e) => e.type === "function").map((e) => e.name);
    expect(names).toEqual(expect.arrayContaining(["transfer", "approve", "transferFrom", "balanceOf", "totalSupply"]));
  });

  it("holds non-empty init bytecode", () => {
    expect(TOKEN_BYTECODE.startsWith("0x6080")).toBe(true);
    expect(TOKEN_BYTECODE.length).toBeGreaterThan(1000);
  });
});
