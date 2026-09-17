import { describe, expect, it } from "vitest";
import { classifyAddress } from "../lib/addresses";

describe("classifyAddress", () => {
  it("accepts 0x EVM addresses", () => {
    expect(classifyAddress("0x097716e767df17605627def0030110f8ee559ec4")).toBe("evm");
  });

  it("rejects short or non-hex 0x", () => {
    expect(classifyAddress("0x123")).toBeNull();
    expect(classifyAddress("0xZZZZ716e767df17605627def0030110f8ee559ec4")).toBeNull();
  });

  it("accepts Solana base58 mint addresses", () => {
    expect(classifyAddress("9bVt7TN2D6PD9y3B5G6g3Mxfh22TLawkKSJQpPTRhxmX")).toBe("solana");
  });

  it("rejects blanks and 0/IlO confusables", () => {
    expect(classifyAddress("")).toBeNull();
    expect(classifyAddress("0OIl1111111111111111111111111111111111")).toBeNull();
  });
});
