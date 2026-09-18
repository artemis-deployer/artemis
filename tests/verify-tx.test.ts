import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@solana/web3.js", () => ({ Connection: vi.fn() }));
vi.mock("../lib/launcher-evm", () => ({ getHoodConfig: vi.fn(), publicClientFor: vi.fn() }));

import { Connection } from "@solana/web3.js";
import { getHoodConfig, publicClientFor } from "../lib/launcher-evm";
import { matchEvmReceipt, mintInKeys, verifyEvmTx, verifySolanaTx } from "../lib/verify-tx";

const MockConnection = vi.mocked(Connection);
const mockGetHood = vi.mocked(getHoodConfig);
const mockPublicFor = vi.mocked(publicClientFor);

beforeEach(() => {
  vi.resetAllMocks();
  mockGetHood.mockReturnValue({} as never);
});

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

describe("verifySolanaTx pruned history (no network)", () => {
  const sig = "5".repeat(88);
  function mockConn(methods: unknown) {
    MockConnection.mockImplementation(function (this: unknown) {
      return methods;
    } as never);
  }
  it("returns false when tx body is null", async () => {
    mockConn({
      getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: "finalized" }] }),
      getTransaction: async () => null,
    });
    await expect(verifySolanaTx("https://rpc.test", "SomeMint11111111111111111111111111111", sig)).resolves.toBe(
      false,
    );
  });
  it("requires expected creator in account keys when given", async () => {
    const mint = "Mint111111111111111111111111111111111111";
    const creator = "Creator11111111111111111111111111111111";
    mockConn({
      getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: "finalized" }] }),
      getTransaction: async () => ({ transaction: { message: { accountKeys: [mint, creator] } } }),
    });
    await expect(verifySolanaTx("https://rpc.test", mint, sig, creator)).resolves.toBe(true);
    mockConn({
      getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: "finalized" }] }),
      getTransaction: async () => ({
        transaction: { message: { accountKeys: [mint, "Other1111111111111111111111111111111111"] } },
      }),
    });
    await expect(verifySolanaTx("https://rpc.test", mint, sig, creator)).resolves.toBe(false);
  });
});

describe("verifyEvmTx creator binding (no network)", () => {
  const addr = "0x097716e767df17605627def0030110f8ee559ec4";
  const hash = `0x${"ab".repeat(32)}`;
  const from = "0x1111111111111111111111111111111111111111";
  function mockReceipt(receipt: unknown) {
    mockPublicFor.mockReturnValue({ getTransactionReceipt: async () => receipt } as never);
  }
  it("accepts when tx.from equals expectedFrom", async () => {
    mockReceipt({ status: "success", from, contractAddress: addr, logs: [] });
    await expect(verifyEvmTx(4663, addr, hash, from)).resolves.toBe(true);
  });
  it("rejects when tx.from differs from expectedFrom", async () => {
    mockReceipt({ status: "success", from, contractAddress: addr, logs: [] });
    await expect(
      verifyEvmTx(4663, addr, hash, "0x2222222222222222222222222222222222222222"),
    ).resolves.toBe(false);
  });
});
