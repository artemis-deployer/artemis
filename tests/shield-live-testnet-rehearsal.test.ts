import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  toBytes,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { decryptShieldBackup, encryptShieldBackup, recoverShieldAccount, proveShieldWithdrawal } from "../lib/shielded-client";
import { buildShieldAssociationSet } from "../lib/shielded-association";
import { buildConfirmedShieldState } from "../lib/shielded-indexer";
import { SHIELDED_ENTRYPOINT_ABI, SHIELDED_POOL_READ_ABI } from "../lib/shielded-contract-abis";
import { resolveShieldRehearsalBackupPath, writeShieldRehearsalBackupOnce } from "../scripts/shield/rehearsal-backup.mjs";
import { depositsPausedOverride, simulatedFundedSenderOverride } from "../scripts/shield/pool-state-overrides.mjs";

const enabled = process.env.RUN_SHIELD_TESTNET_REHEARSAL === "1";
const apiBase = process.env.SHIELD_E2E_API_BASE || "http://127.0.0.1:3011";
const manifestPath = join(process.cwd(), "deployments/robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json");
const backupPath = resolveShieldRehearsalBackupPath({ projectDirectory: process.cwd() });
const SNARK_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

describe.skipIf(!enabled)("Robinhood testnet Shield E2E rehearsal", () => {
  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  const originalFetch = globalThis.fetch;

  it("recovers a note, proves withdrawal, relays it, and returns test ETH to the operator", async () => {
    const key = (process.env.SHIELD_DEPLOYER_PRIVATE_KEY || "").trim();
    expect(key).toMatch(/^0x[0-9a-fA-F]{64}$/);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    expect(manifest.chainId).toBe(46630);
    expect(manifest.denominationWei).toBe("1000000000000000");
    const rpcUrl = process.env.SHIELD_RPC_URL || "https://robinhood-sepolia-rpc.publicnode.com";
    const chain = defineChain({
      id: 46630,
      name: "Robinhood Chain Testnet",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
    const operator = privateKeyToAccount(key as `0x${string}`);
    const recipientSeed = keccak256(toBytes(`${key}:artemis-shield-e2e-recipient-v1`));
    const recipient = privateKeyToAccount(recipientSeed);
    const acceptableDust = 1_000_000_000_000n;
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    const wallet = createWalletClient({ account: operator, chain, transport: http(rpcUrl) });
    const recipientWallet = createWalletClient({ account: recipient, chain, transport: http(rpcUrl) });
    async function sweepRecipientBalance(): Promise<`0x${string}` | undefined> {
      const balance = await client.getBalance({ address: recipient.address });
      if (balance <= acceptableDust) return undefined;
      const gas = await client.estimateGas({ account: recipient.address, to: operator.address, value: balance });
      const gasPrice = await client.getGasPrice();
      const value = balance - gas * gasPrice;
      if (value <= 0n) throw new Error("test_recipient_balance_cannot_cover_sweep_gas");
      const hash = await recipientWallet.sendTransaction({ to: operator.address, value, gas, gasPrice });
      const receipt = await client.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
      if (receipt.status !== "success") throw new Error("test_recipient_sweep_failed");
      return hash;
    }
    const recoverySweepHash = await sweepRecipientBalance();
    const denomination = BigInt(manifest.denominationWei);
    const pool = {
      chainId: 46630,
      address: manifest.contracts.pool.address as Address,
      scope: await client.readContract({ address: manifest.contracts.pool.address, abi: SHIELDED_POOL_READ_ABI, functionName: "SCOPE" }) as never,
      deploymentBlock: BigInt(manifest.poolDeploymentBlock),
    };
    const baselinePoolBalance = await client.getBalance({ address: pool.address });
    const configResponse = await originalFetch(`${apiBase}/api/shield/config`, { cache: "no-store" });
    const config = await configResponse.json() as {
      configured: boolean;
      enabled: boolean;
      depositEnabled: boolean;
      withdrawEnabled: boolean;
      denominationWei?: string;
      entrypoint?: Address;
      pool?: Address;
      scope?: string;
      rpcUrl?: string;
    };
    expect(configResponse.status).toBe(200);
    expect(config.configured && config.enabled && config.depositEnabled && config.withdrawEnabled).toBe(true);
    expect(config.denominationWei).toBe(denomination.toString());
    expect(config.pool?.toLowerCase()).toBe(pool.address.toLowerCase());
    expect(config.entrypoint).toBeDefined();

    let phrase: string;
    if (existsSync(backupPath)) {
      phrase = await decryptShieldBackup(JSON.parse(readFileSync(backupPath, "utf8")), key);
    } else {
      const created = (await import("../lib/shielded-client")).createShieldRecoveryPhrase();
      const encrypted = await encryptShieldBackup(created, key);
      writeShieldRehearsalBackupOnce(backupPath, `${JSON.stringify(encrypted, null, 2)}\n`);
      phrase = created;
    }
    expect(await decryptShieldBackup(JSON.parse(readFileSync(backupPath, "utf8")), key)).toBe(phrase);

    let restored = await recoverShieldAccount(phrase, [pool], rpcUrl);
    expect(restored.errors).toHaveLength(0);
    let notes = restored.account.getSpendableCommitments().get(pool.scope) ?? [];
    let depositHash: Hex | undefined;
    if (notes.length === 0) {
      if (process.env.SHIELD_E2E_ALLOW_NEW_DEPOSIT !== "1") {
        throw new Error("No recoverable spendable note found; refusing to create another testnet deposit. Pass --allow-new-deposit only when intentionally funding a fresh rehearsal note.");
      }
      const existingPoolBalance = await client.getBalance({ address: pool.address });
      if (existingPoolBalance > 0n && process.env.SHIELD_E2E_ACKNOWLEDGE_RESIDUAL_POOL_BALANCE !== "1") {
        throw new Error("Existing pool balance requires --acknowledge-unreconciled-pool-balance before any new test deposit.");
      }
      const balance = await client.getBalance({ address: operator.address });
      expect(balance > denomination + 10_000_000_000_000n).toBe(true);
      const secrets = restored.account.createDepositSecrets(pool.scope);
      const { request } = await client.simulateContract({
        account: operator,
        address: config.entrypoint!,
        abi: SHIELDED_ENTRYPOINT_ABI,
        functionName: "deposit",
        args: [secrets.precommitment],
        value: denomination,
      });
      depositHash = await wallet.writeContract(request);
      const depositReceipt = await client.waitForTransactionReceipt({ hash: depositHash, confirmations: 13, timeout: 900_000 });
      expect(depositReceipt.status).toBe("success");
      restored = await recoverShieldAccount(phrase, [pool], rpcUrl);
      expect(restored.errors).toHaveLength(0);
      notes = restored.account.getSpendableCommitments().get(pool.scope) ?? [];
    }
    expect(notes.length).toBeGreaterThan(0);

    const publishOutput = execFileSync(process.execPath, ["--env-file=.env.local", "scripts/shield/publish-association-set.mjs"], {
      cwd: process.cwd(),
      env: { ...process.env, SHIELD_CONFIRMATIONS: "13" },
      encoding: "utf8",
      timeout: 900_000,
    });
    const aspPublish = JSON.parse(publishOutput) as { transactionHash: `0x${string}`; depositCount: number };
    expect(aspPublish.depositCount).toBeGreaterThan(0);
    const aspReceipt = await client.waitForTransactionReceipt({ hash: aspPublish.transactionHash, confirmations: 13, timeout: 900_000 });
    expect(aspReceipt.status).toBe("success");

    console.log("E2E checkpoint: ASP root reached 12 confirmations.");
    const associationResponse = await originalFetch(`${apiBase}/api/shield/association`, { cache: "no-store" });
    expect(associationResponse.status).toBe(200);
    const associationData = await associationResponse.json() as { labels: string[]; root: string; pool: string };
    expect(associationData.pool.toLowerCase()).toBe(pool.address.toLowerCase());
    const associationSet = buildShieldAssociationSet(associationData.labels.map((label) => BigInt(label)));
    expect(associationSet.root).toBe(BigInt(associationData.root));

    const state = await buildConfirmedShieldState(client, pool.address, pool.deploymentBlock, 12);
    console.log("E2E checkpoint: confirmed state tree rebuilt.");
    const treeMatches = notes.filter((note) => state.tree.leaves.includes(note.hash)).length;
    const associationMatches = notes.filter((note) => associationSet.labels.includes(note.label)).length;
    console.log(JSON.stringify({ noteDiagnostic: { recoveredSpendableNotes: notes.length, stateTreeMatches: treeMatches, associationSetMatches: associationMatches } }));
    const commitment = notes.find((note) => state.tree.leaves.includes(note.hash) && associationSet.labels.includes(note.label));
    expect(commitment).toBeDefined();

    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string" && input.startsWith("/shield-artifacts/")) {
        return originalFetch(new URL(input, apiBase), init);
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    const { withdrawalProof, withdrawal } = await proveShieldWithdrawal({
      sdk: restored.sdk,
      accountService: restored.account,
      commitment: commitment!,
      stateTree: state.tree,
      associationSet,
      entrypoint: config.entrypoint!,
      recipient: recipient.address,
      feeRecipient: operator.address,
      scope: pool.scope,
      withdrawalAmount: denomination,
    });
    console.log("E2E checkpoint: Groth16 withdrawal proof generated.");
    expect(BigInt(withdrawalProof.publicSignals[2] as string)).toBe(denomination);

    // Exercise a real valid proof against the actual EntryPoint while the pool pause bit exists only in eth_call state.
    const proofCoordinates = withdrawalProof.proof as unknown as {
      pi_a: (string | bigint)[];
      pi_b: ((string | bigint)[])[];
      pi_c: (string | bigint)[];
    };
    const proofStruct = {
      pA: [BigInt(proofCoordinates.pi_a[0]), BigInt(proofCoordinates.pi_a[1])],
      pB: [
        [BigInt(proofCoordinates.pi_b[0][1]), BigInt(proofCoordinates.pi_b[0][0])],
        [BigInt(proofCoordinates.pi_b[1][1]), BigInt(proofCoordinates.pi_b[1][0])],
      ],
      pC: [BigInt(proofCoordinates.pi_c[0]), BigInt(proofCoordinates.pi_c[1])],
      pubSignals: withdrawalProof.publicSignals.map((signal) => BigInt(signal as string)),
    };
    const entrypointAbi = JSON.parse(readFileSync("artifacts/shielded/0xbow-v1.2.1/Entrypoint.json", "utf8")).abi;
    const poolArtifact = JSON.parse(readFileSync("artifacts/shielded/0xbow-v1.2.1/PrivacyPoolSimple.json", "utf8"));
    const [poolPausedBefore, lifetimeDepositedBefore, poolBalanceBefore] = await Promise.all([
      client.readContract({ address: pool.address, abi: poolArtifact.abi, functionName: "depositsPaused" }),
      client.readContract({ address: pool.address, abi: poolArtifact.abi, functionName: "lifetimeDeposited" }),
      client.getBalance({ address: pool.address }),
    ]);
    console.log("E2E checkpoint: read deployed pause state.");
    expect(poolPausedBefore).toBe(false);
    const relayCallData = encodeFunctionData({
      abi: entrypointAbi,
      functionName: "relay",
      args: [withdrawal, proofStruct, pool.scope],
    } as never);
    await client.call({
      account: operator.address,
      to: config.entrypoint!,
      data: relayCallData,
      gas: 12_000_000n,
      gasPrice: 0n,
      stateOverride: [
        depositsPausedOverride(pool.address),
        simulatedFundedSenderOverride(operator.address, 100n * 10n ** 18n),
      ] as never,
    });
    console.log("E2E checkpoint: pause-state withdrawal eth_call succeeded.");
    const [poolPausedAfterSimulation, lifetimeDepositedAfterSimulation, poolBalanceAfterSimulation] = await Promise.all([
      client.readContract({ address: pool.address, abi: poolArtifact.abi, functionName: "depositsPaused" }),
      client.readContract({ address: pool.address, abi: poolArtifact.abi, functionName: "lifetimeDeposited" }),
      client.getBalance({ address: pool.address }),
    ]);
    expect(poolPausedAfterSimulation).toBe(poolPausedBefore);
    expect(lifetimeDepositedAfterSimulation).toBe(lifetimeDepositedBefore);
    expect(poolBalanceAfterSimulation).toBe(poolBalanceBefore);
    console.log("E2E checkpoint: valid withdrawal simulated while deposits are paused; persistent state unchanged.");

    async function relay(recipientAddress: Address, proof: typeof withdrawalProof) {
      return originalFetch(`${apiBase}/api/shield/relay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipient: recipientAddress, withdrawalProof: proof }, (_key, value) => typeof value === "bigint" ? value.toString() : value),
      });
    }

    const tamperedRecipient = `0x${recipient.address.slice(2).replace(/^./, recipient.address[2] === "0" ? "1" : "0")}` as Address;
    const tamperedRecipientResponse = await relay(tamperedRecipient, withdrawalProof);
    console.log("E2E checkpoint: tampered recipient relay request completed.");
    expect(tamperedRecipientResponse.status).toBe(400);

    const staleRootProof = structuredClone(withdrawalProof);
    staleRootProof.publicSignals[5] = ((BigInt(staleRootProof.publicSignals[5] as string) + 1n) % SNARK_FIELD).toString() as never;
    const staleRootResponse = await relay(recipient.address, staleRootProof);
    expect(staleRootResponse.status).toBe(409);
    expect((await staleRootResponse.json()).error).toBe("association_root_stale");

    // ProofLib's public signal order is [newCommitment, nullifier, value, stateRoot, stateDepth, ASPRoot, ASPDepth, context].
    // Keep the ASP root valid so this specifically exercises the pool's known-state-root check.
    const unknownStateRootProof = structuredClone(withdrawalProof);
    unknownStateRootProof.publicSignals[3] = ((BigInt(unknownStateRootProof.publicSignals[3] as string) + 1n) % SNARK_FIELD).toString() as never;
    const unknownStateRootResponse = await relay(recipient.address, unknownStateRootProof);
    expect(unknownStateRootResponse.status).toBe(400);
    expect((await unknownStateRootResponse.json()).error).toBe("shield_relay_failed");

    const relayResponse = await relay(recipient.address, withdrawalProof);
    const relayResult = await relayResponse.json() as { transactionHash?: `0x${string}`; error?: string };
    expect(relayResponse.status, relayResult.error).toBe(200);
    expect(relayResult.transactionHash).toBeDefined();
    const withdrawalHash = relayResult.transactionHash!;
    const withdrawalReceipt = await client.waitForTransactionReceipt({ hash: withdrawalHash, confirmations: 12, timeout: 900_000 });
    expect(withdrawalReceipt.status).toBe("success");
    const replayResponse = await relay(recipient.address, withdrawalProof);
    expect(replayResponse.status).toBe(409);
    expect((await replayResponse.json()).error).toBe("nullifier_already_spent");

    const nullifierHash = BigInt(withdrawalProof.publicSignals[1] as string);
    expect(await client.readContract({ address: pool.address, abi: poolArtifact.abi, functionName: "nullifierHashes", args: [nullifierHash] })).toBe(true);
    const recipientBalance = await client.getBalance({ address: recipient.address });
    expect(recipientBalance >= denomination).toBe(true);

    const sweepHash = await sweepRecipientBalance();
    expect(sweepHash).toBeDefined();
    expect(await client.getBalance({ address: recipient.address })).toBeLessThanOrEqual(acceptableDust);

    const postWithdrawalState = await buildConfirmedShieldState(client, pool.address, pool.deploymentBlock, 12);
    expect(postWithdrawalState.tree.leaves.length).toBeGreaterThan(state.tree.leaves.length);
    const endingPoolBalance = await client.getBalance({ address: pool.address });
    const finalizedHead = await client.getBlockNumber();
    async function readAllPoolEvents<T extends "Deposited" | "Withdrawn">(eventName: T) {
      const events = [] as Awaited<ReturnType<typeof client.getContractEvents>>[];
      for (let fromBlock = pool.deploymentBlock; fromBlock <= finalizedHead; fromBlock += 1800n) {
        const toBlock = fromBlock + 1799n < finalizedHead ? fromBlock + 1799n : finalizedHead;
        events.push(await client.getContractEvents({
          address: pool.address,
          abi: poolArtifact.abi,
          eventName,
          fromBlock,
          toBlock,
          strict: true,
        }) as never);
      }
      return events.flat() as unknown as { args: { _value: bigint }; transactionHash: Hex }[];
    }
    const [depositEvents, withdrawalEvents] = await Promise.all([
      readAllPoolEvents("Deposited"),
      readAllPoolEvents("Withdrawn"),
    ]);
    const totalDeposited = depositEvents.reduce((sum, event) => sum + event.args._value, 0n);
    const totalWithdrawn = withdrawalEvents.reduce((sum, event) => sum + event.args._value, 0n);
    expect(totalDeposited - totalWithdrawn).toBe(endingPoolBalance);

    manifest.associationSetHistory = manifest.associationSetHistory ?? [];
    manifest.rehearsal = {
      status: baselinePoolBalance > 0n ? "passed_with_preexisting_residual_balance" : "passed",
      denominationWei: denomination.toString(),
      depositTransactionHash: depositHash || "reused-recoverable-note",
      associationPublishTransactionHash: aspPublish.transactionHash,
      withdrawalTransactionHash: withdrawalHash,
      recipientSweepTransactionHash: sweepHash,
      recoveredPriorRecipientSweepTransactionHash: recoverySweepHash ?? null,
      checkedNullifier: nullifierHash.toString(),
      poolReconciliation: {
        startingBalanceWei: baselinePoolBalance.toString(),
        endingBalanceWei: endingPoolBalance.toString(),
        depositEvents: depositEvents.length,
        withdrawalEvents: withdrawalEvents.length,
        totalDepositedWei: totalDeposited.toString(),
        totalWithdrawnWei: totalWithdrawn.toString(),
        unspentPoolBalanceWei: endingPoolBalance.toString(),
        recoveryStatus: endingPoolBalance > 0n ? "new rehearsal note was backed up and spent; pre-existing residual note recovery remains unknown" : "pool balance reconciled",
      },
      passedScenarios: [1, 2, 4],
      partiallyPassedScenarios: [8, 12],
      relayProtectionChecks: ["tampered_recipient_rejected", "stale_association_root_rejected", "unknown_merkle_state_root_rejected", "spent_nullifier_replay_rejected"],
      observedDepositWithdrawInvariant: true,
      completedAt: new Date().toISOString(),
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(JSON.stringify({
      status: "passed",
      chainId: chain.id,
      denomination: formatEther(denomination),
      depositTransactionHash: depositHash || "reused-recoverable-note",
      associationPublishTransactionHash: aspPublish.transactionHash,
      withdrawalTransactionHash: withdrawalHash,
      recipientSweepTransactionHash: sweepHash,
      recoveredPriorRecipientSweepTransactionHash: recoverySweepHash ?? null,
      noteBackupRoundTrip: true,
      noteRecoveredFromEvents: true,
      associationRootVerified: true,
      withdrawalProofVerified: true,
      tamperedRecipientRejected: true,
      staleAssociationRootRejected: true,
      unknownMerkleStateRootRejected: true,
      withdrawalWorksWhileDepositsPaused: true,
      nullifierSpent: true,
      replayedWithdrawalRejected: true,
      recipientPaid: true,
      recipientBalanceReturnedToDustThreshold: true,
      postWithdrawalIndexerRebuild: true,
      depositWithdrawInvariant: true,
    }, null, 2));
  }, 1_800_000);
});
