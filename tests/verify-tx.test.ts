import { describe, expect, it } from "vitest";
import { matchEvmReceipt, mintInKeys, verifyEvmTx, verifySolanaTx } from "../lib/verify-tx";

describe("matchEvmReceipt", () => {
  const addr = "0x097716e767df17605627def0030110f8ee559ec4";
  it("matches contractAddress", () => {
    expect(matchEvmReceipt({ contractAddress: addr, logs: [] }, addr)).toBe(true);
  });
  it("matches log address", () => {
    expect(matchEvmReceipt({ logs: [{ address: addr }] }, addr)).toBe(true);
  });
  it("rejects no match", () => {
    expect(
      matchEvmReceipt(
        {
          contractAddress: "0x0000000000000000000000000000000000000001",
          to: "0x0000000000000000000000000000000000000002",
          from: "0x0000000000000000000000000000000000000003",
          logs: [{ address: "0x0000000000000000000000000000000000000004" }],
        },
        addr,
      ),
    ).toBe(false);
  });
  it("matches case-insensitive", () => {
    expect(matchEvmReceipt({ to: addr.toUpperCase(), logs: [] }, addr)).toBe(true);
    expect(matchEvmReceipt({ from: addr, logs: [] }, addr.toUpperCase())).toBe(true);
  });
});

describe("mintInKeys", () => {
  it("exact match only", () => {
    expect(mintInKeys(["Abc123", "Xyz"], "Abc123")).toBe(true);
    expect(mintInKeys(["abc123"], "Abc123")).toBe(false);
    expect(mintInKeys([], "Abc123")).toBe(false);
  });
});

describe("format rejections (no network)", () => {
  it("verifyEvmTx rejects bad hash", async () => {
    await expect(verifyEvmTx(4663, "0x097716e767df17605627def0030110f8ee559ec4", "nope")).resolves.toBe(
      false,
    );
    await expect(verifyEvmTx(4663, "0x097716e767df17605627def0030110f8ee559ec4", "0x1234")).resolves.toBe(
      false,
    );
  });
  it("verifySolanaTx rejects bad sig", async () => {
    await expect(verifySolanaTx("https://api.mainnet-beta.solana.com", "Mint111", "nope")).resolves.toBe(
      false,
    );
    await expect(verifySolanaTx("https://api.mainnet-beta.solana.com", "Mint111", "0".repeat(88))).resolves.toBe(
      false,
    );
  });
});
