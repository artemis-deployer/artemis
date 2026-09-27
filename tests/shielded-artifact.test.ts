import { describe, expect, it } from "vitest";
import { SHIELDED_ABI, SHIELDED_BYTECODE, SHIELDED_MOCK_ABI, SHIELDED_MOCK_BYTECODE } from "../lib/shielded-artifact";

function names(abi: readonly unknown[]): string[] {
  return (abi as { name?: string }[]).map((e) => e.name ?? "").filter(Boolean);
}

describe("shielded artifacts", () => {
  it("pool exposes the deposit/withdraw lifecycle", () => {
    const n = names(SHIELDED_ABI);
    for (const fn of ["deposit", "withdraw", "pauseDeposits", "unpauseDeposits", "renounceGuardian"]) {
      expect(n).toContain(fn);
    }
  });

  it("pool emits Deposit and Withdraw", () => {
    const events = (SHIELDED_ABI as unknown as { type?: string; name?: string }[])
      .filter((e) => e.type === "event")
      .map((e) => e.name);
    expect(events).toContain("Deposit");
    expect(events).toContain("Withdraw");
  });

  it("pool enforces caps and guardian in the ABI", () => {
    const n = names(SHIELDED_ABI);
    for (const fn of ["denomination", "poolCap", "totalDeposits", "totalWithdrawn", "guardian", "depositsPaused"]) {
      expect(n).toContain(fn);
    }
  });

  it("mock verifier exposes a verify entrypoint", () => {
    expect(names(SHIELDED_MOCK_ABI)).toContain("verify");
  });

  it("bytecodes are non-empty mainnet candidates", () => {
    expect(SHIELDED_BYTECODE.startsWith("0x")).toBe(true);
    expect(SHIELDED_BYTECODE.length).toBeGreaterThan(100);
    expect(SHIELDED_MOCK_BYTECODE.startsWith("0x")).toBe(true);
    expect(SHIELDED_MOCK_BYTECODE.length).toBeGreaterThan(10);
  });
});
