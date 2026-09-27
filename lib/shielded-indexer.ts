import type { Address, PublicClient } from "viem";
import { SHIELDED_POOL_READ_ABI } from "./shielded-contract-abis";
import { buildShieldStateTree, type ShieldStateTree } from "./shielded-state-tree";

export interface ShieldStateSnapshot {
  tree: ShieldStateTree;
  blockNumber: bigint;
  blockHash: `0x${string}`;
}

export async function readRecentShieldRoots(
  client: PublicClient,
  pool: Address,
  currentIndex: number,
  historySize = 64,
  batchSize = 8,
): Promise<bigint[]> {
  const indexes = Array.from({ length: historySize }, (_, offset) => (currentIndex - offset + historySize) % historySize);
  const roots: bigint[] = [];
  for (let start = 0; start < indexes.length; start += batchSize) {
    const batch = indexes.slice(start, start + batchSize);
    const values = await Promise.all(batch.map((index) => client.readContract({
      address: pool,
      abi: SHIELDED_POOL_READ_ABI,
      functionName: "roots",
      args: [BigInt(index)],
    })));
    roots.push(...values);
  }
  return roots;
}

export async function buildConfirmedShieldState(
  client: PublicClient,
  pool: Address,
  deploymentBlock: bigint,
  confirmations = 12,
): Promise<ShieldStateSnapshot> {
  const head = await client.getBlockNumber();
  const depth = BigInt(Math.max(12, confirmations));
  if (head <= depth) throw new Error("shield_finalized_head_unavailable");
  const blockNumber = head - depth;
  if (deploymentBlock > blockNumber) throw new Error("shield_no_confirmed_pool_blocks");
  const before = await client.getBlock({ blockNumber });
  const leaves: { kind: "deposit" | "withdrawal"; commitment: bigint; blockNumber: bigint; logIndex: number }[] = [];

  const CHUNK_SIZE = 40000n;
  for (let fromBlock = deploymentBlock; fromBlock <= blockNumber; fromBlock += CHUNK_SIZE) {
    const toBlock = fromBlock + (CHUNK_SIZE - 1n) < blockNumber ? fromBlock + (CHUNK_SIZE - 1n) : blockNumber;
    const [deposits, withdrawals] = await Promise.all([
      client.getContractEvents({ address: pool, abi: SHIELDED_POOL_READ_ABI, eventName: "Deposited", fromBlock, toBlock, strict: true }),
      client.getContractEvents({ address: pool, abi: SHIELDED_POOL_READ_ABI, eventName: "Withdrawn", fromBlock, toBlock, strict: true }),
    ]);
    for (const event of deposits) {
      leaves.push({ kind: "deposit", commitment: event.args._commitment, blockNumber: event.blockNumber, logIndex: event.logIndex });
    }
    for (const event of withdrawals) {
      leaves.push({ kind: "withdrawal", commitment: event.args._newCommitment, blockNumber: event.blockNumber, logIndex: event.logIndex });
    }
  }

  const after = await client.getBlock({ blockNumber });
  if (before.hash !== after.hash) throw new Error("shield_snapshot_reorged_retry");
  const tree = buildShieldStateTree(leaves);
  const currentIndex = Number(await client.readContract({ address: pool, abi: SHIELDED_POOL_READ_ABI, functionName: "currentRootIndex" }));
  const knownRoots = await readRecentShieldRoots(client, pool, currentIndex);
  if (!knownRoots.some((root) => root === tree.root)) throw new Error("shield_rebuilt_root_not_onchain");
  return { tree, blockNumber, blockHash: before.hash };
}
