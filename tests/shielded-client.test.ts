import { describe, expect, it, vi } from "vitest";
import { buildShieldAssociationSet } from "../lib/shielded-association";
import { ArtemisShieldDataService, decryptShieldBackup, encryptShieldBackup, proveShieldWithdrawal } from "../lib/shielded-client";

describe("encrypted shield recovery backups", () => {
  const phrase = "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";

  it("round trips a recovery phrase with the correct password", async () => {
    const backup = await encryptShieldBackup(phrase, "a-long-test-password-123");
    await expect(decryptShieldBackup(backup, "a-long-test-password-123")).resolves.toBe(phrase);
  });

  it("rejects the wrong password without returning plaintext", async () => {
    const backup = await encryptShieldBackup(phrase, "a-long-test-password-123");
    await expect(decryptShieldBackup(backup, "wrong-password-value")).rejects.toThrow("shield_backup_decryption_failed");
  });

  it("rejects malformed backup envelopes", async () => {
    await expect(decryptShieldBackup({ version: 1, algorithm: "AES-GCM" }, "a-long-test-password-123"))
      .rejects.toThrow("shield_backup_invalid");
  });

  it("refuses weak passwords", async () => {
    await expect(encryptShieldBackup(phrase, "short")).rejects.toThrow("shield_backup_password_too_short");
  });

  it("adapts the pinned SDK recovery parser to the actual pool deposit event", async () => {
    const service = new ArtemisShieldDataService([{ chainId: 46630, privacyPoolAddress: "0x1111111111111111111111111111111111111111", startBlock: 1n, rpcUrl: "http://127.0.0.1:8545" }]);
    const raw = {
      address: "0x1111111111111111111111111111111111111111",
      blockHash: `0x${"11".repeat(32)}`,
      blockNumber: 2n,
      logIndex: 0,
      transactionHash: `0x${"22".repeat(32)}`,
      args: { _depositor: "0x3333333333333333333333333333333333333333", _commitment: 44n, _label: 55n, _value: 100000000000000000n, _precommitmentHash: 66n },
    };
    const client = { getBlockNumber: async () => 20n, getContractEvents: async () => [raw] };
    (service as unknown as { shieldClients: Map<number, unknown> }).shieldClients.set(46630, client);
    const deposits = await service.getDeposits({ chainId: 46630, address: raw.address as `0x${string}`, scope: 7n as never, deploymentBlock: 1n });
    expect(deposits[0]?.precommitment).toBe(66n);
  });
});

describe("withdrawal proving for configured pool denominations", () => {
  it("proves the exact denomination configured for the pool", async () => {
    const commitment = { hash: 11n, label: 22n };
    const sdk = {
      proveWithdrawal: vi.fn(async (_note: unknown, input: unknown) => input),
      verifyWithdrawal: vi.fn(async () => true),
    };
    const accountService = { createWithdrawalSecrets: () => ({ nullifier: 33n, secret: 44n }) };
    const input = {
      sdk,
      accountService,
      commitment,
      stateTree: { leaves: [11n], proof: () => [], root: 55n },
      associationSet: buildShieldAssociationSet([22n]),
      entrypoint: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
      feeRecipient: "0x3333333333333333333333333333333333333333",
      scope: 66n,
      withdrawalAmount: 1_000_000_000_000_000n,
    } as never;

    await proveShieldWithdrawal(input);

    expect(sdk.proveWithdrawal).toHaveBeenCalledWith(commitment, expect.objectContaining({
      withdrawalAmount: 1_000_000_000_000_000n,
    }));
  });

  it("rejects a commitment excluded from the association set before creating a proof", async () => {
    const proveWithdrawal = vi.fn();
    const createWithdrawalSecrets = vi.fn();
    const input = {
      sdk: { proveWithdrawal, verifyWithdrawal: vi.fn() },
      accountService: { createWithdrawalSecrets },
      commitment: { hash: 11n, label: 99n },
      stateTree: { leaves: [11n], proof: () => [], root: 55n },
      associationSet: buildShieldAssociationSet([22n]),
      entrypoint: "0x1111111111111111111111111111111111111111",
      recipient: "0x2222222222222222222222222222222222222222",
      feeRecipient: "0x3333333333333333333333333333333333333333",
      scope: 66n,
      withdrawalAmount: 1_000_000_000_000_000n,
    } as never;

    await expect(proveShieldWithdrawal(input)).rejects.toThrow("shield_asp_label_missing");
    expect(createWithdrawalSecrets).not.toHaveBeenCalled();
    expect(proveWithdrawal).not.toHaveBeenCalled();
  });
});
