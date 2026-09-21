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
  it("rejects null value array and null slot (pruned / missing)", async () => {
    mockConn({ getSignatureStatuses: async () => ({ value: null }), getTransaction: async () => null });
    await expect(verifySolanaTx("https://rpc.test", "SomeMint11111111111111111111111111111", sig)).resolves.toBe(
      false,
    );
    mockConn({ getSignatureStatuses: async () => ({ value: [null] }), getTransaction: async () => null });
    await expect(verifySolanaTx("https://rpc.test", "SomeMint11111111111111111111111111111", sig)).resolves.toBe(
      false,
    );
  });
  it("rejects processed commitment (needs confirmed/finalized)", async () => {
    mockConn({
      getSignatureStatuses: async () => ({ value: [{ err: null, confirmationStatus: "processed" }] }),
      getTransaction: async () => ({ transaction: { message: { accountKeys: ["M"] } } }),
    });
    await expect(verifySolanaTx("https://rpc.test", "M", sig)).resolves.toBe(false);
  });
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

describe("ADVERSARIAL: showcase squatting (EVM touch-only tx)", () => {
  const victim = "0x097716e767df17605627def0030110f8ee559ec4";
  const attacker = "0x1111111111111111111111111111111111111111";
  const randomContract = "0x3333333333333333333333333333333333333333";
  const hash = `0x${"ab".repeat(32)}`;
  function mockReceipt(receipt: unknown) {
    mockPublicFor.mockReturnValue({ getTransactionReceipt: async () => receipt } as never);
  }
  it("REJECTS attacker approve-0 to random contract merely touching victim (to != trusted, no creation)", async () => {
    mockReceipt({ status: "success", from: attacker, to: randomContract, contractAddress: null, logs: [{ address: victim }] });
    await expect(verifyEvmTx(4663, victim, hash, attacker)).resolves.toBe(false);
  });
  it("REJECTS attacker transfer-1-wei to victim token contract (to == token but no creation, untrusted)", async () => {
    mockReceipt({ status: "success", from: attacker, to: victim, contractAddress: null, logs: [{ address: victim }] });
    await expect(verifyEvmTx(4663, victim, hash, attacker)).resolves.toBe(false);
  });
  it("ACCEPTS legit deploy (contractAddress == token)", async () => {
    mockReceipt({ status: "success", from: attacker, to: null, contractAddress: victim, logs: [] });
    await expect(verifyEvmTx(4663, victim, hash, attacker)).resolves.toBe(true);
  });
  it("ACCEPTS legit addLiquidity (to == router, token in logs)", async () => {
    const router = "0x89e5db8b5aa49aa85ac63f691524311aeb649eba";
    mockGetHood.mockReturnValue({ router, factory: null, launcher: null } as never);
    mockReceipt({ status: "success", from: attacker, to: router, contractAddress: null, logs: [{ address: victim }] });
    await expect(verifyEvmTx(4663, victim, hash, attacker)).resolves.toBe(true);
  });
  it("ACCEPTS legit one-tx launch (to == launcher, token in logs)", async () => {
    const launcher = "0xeea9d0f7ee0958c6d59f25162be4e69ba60a0f71";
    mockGetHood.mockReturnValue({ router: null, factory: null, launcher } as never);
    mockReceipt({ status: "success", from: attacker, to: launcher, contractAddress: null, logs: [{ address: victim }] });
    await expect(verifyEvmTx(4663, victim, hash, attacker)).resolves.toBe(true);
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
  it("rejects non-success statuses (reverted and raw 0x1 never count)", async () => {
    mockReceipt({ status: "reverted", from, contractAddress: addr, logs: [] });
    await expect(verifyEvmTx(4663, addr, hash, from)).resolves.toBe(false);
    mockReceipt({ status: "0x1", from, contractAddress: addr, logs: [] });
    await expect(verifyEvmTx(4663, addr, hash, from)).resolves.toBe(false);
  });
  it("rejects PENDING tx (null receipt) as invalid_tx path (user retries after mining)", async () => {
    mockReceipt(null);
    await expect(verifyEvmTx(4663, addr, hash, from)).resolves.toBe(false);
  });
  it("rejects RPC throw (pending/unmined) as false, never throws", async () => {
    mockPublicFor.mockReturnValue({
      getTransactionReceipt: async () => {
        throw new Error("not found");
      },
    } as never);
    await expect(verifyEvmTx(4663, addr, hash, from)).resolves.toBe(false);
  });
  it("rejects FAILED solana tx (err set) as false", async () => {
    const sig = "5".repeat(88);
    MockConnection.mockImplementation(function (this: unknown) {
      return {
        getSignatureStatuses: async () => ({ value: [{ err: { InstructionError: [0, "Custom"] }, confirmationStatus: "finalized" }] }),
        getTransaction: async () => null,
      };
    } as never);
    await expect(verifySolanaTx("https://rpc.test", "Mint111111111111111111111111111111111111", sig)).resolves.toBe(
      false,
    );
  });
});

describe("chain-confusion: string vs number chainId", () => {
  const victim = "0x097716e767df17605627def0030110f8ee559ec4";
  const attacker = "0x1111111111111111111111111111111111111111";
  const hash = `0x${"ab".repeat(32)}`;
  it('accepts string "4663" same as number 4663 (normalize with Number first)', async () => {
    mockGetHood.mockImplementation(((id: unknown) =>
      id === 4663 ? { router: null, factory: null, launcher: null } : undefined) as never);
    mockPublicFor.mockReturnValue({
      getTransactionReceipt: async () => ({ status: "success", from: attacker, contractAddress: victim, logs: [] }),
    } as never);
    await expect(verifyEvmTx("4663" as unknown as 4663, victim, hash, attacker)).resolves.toBe(true);
  });
  it('accepts string "46630" same as number 46630', async () => {
    mockGetHood.mockImplementation(((id: unknown) =>
      id === 46630 ? { router: null, factory: null, launcher: null } : undefined) as never);
    mockPublicFor.mockReturnValue({
      getTransactionReceipt: async () => ({ status: "success", from: attacker, contractAddress: victim, logs: [] }),
    } as never);
    await expect(verifyEvmTx("46630" as unknown as 46630, victim, hash, attacker)).resolves.toBe(true);
  });
});

describe("cross-network replay: tx from different chain/RPC proves nothing", () => {
  it("EVM testnet txhash looked up on mainnet RPC (null receipt) -> false", async () => {
    mockGetHood.mockReturnValue({ router: null, factory: null, launcher: null } as never);
    mockPublicFor.mockReturnValue({ getTransactionReceipt: async () => null } as never);
    const addr = "0x097716e767df17605627def0030110f8ee559ec4";
    const hash = `0x${"cd".repeat(32)}`;
    await expect(
      verifyEvmTx(4663, addr, hash, "0x1111111111111111111111111111111111111111"),
    ).resolves.toBe(false);
  });
  it("mainnet solana sig submitted as devnet (null status) -> false", async () => {
    const sig = "5".repeat(88);
    MockConnection.mockImplementation(function (this: unknown) {
      return {
        getSignatureStatuses: async () => ({ value: [null] }),
        getTransaction: async () => null,
      };
    } as never);
    await expect(verifySolanaTx("https://devnet-rpc.test", "Mint111111111111111111111111111111111111", sig)).resolves.toBe(
      false,
    );
  });
});
