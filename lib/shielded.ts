import { randomBytes } from "node:crypto";
import { encodePacked, keccak256, parseEther } from "viem";

export const SHIELD_TREE_DEPTH = 20;

/** Fixed denominations in wei. Free amounts shrink the anonymity set, so only these exist. */
export const DENOMINATIONS = [parseEther("0.01"), parseEther("0.1"), parseEther("1")];

export type ShieldNote = { nullifier: `0x${string}`; secret: `0x${string}` };

function rand32(): `0x${string}` {
  return `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
}

/** Backup this note: losing it means the funds can never be withdrawn. */
export function makeNote(): ShieldNote {
  return { nullifier: rand32(), secret: rand32() };
}

export function commitmentOf(note: ShieldNote): `0x${string}` {
  return keccak256(encodePacked(["bytes32", "bytes32"], [note.nullifier, note.secret]));
}

export function nullifierHashOf(note: ShieldNote): `0x${string}` {
  return keccak256(encodePacked(["bytes32"], [note.nullifier]));
}

const ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export type DepositGate = {
  paused: boolean;
  value: bigint;
  denomination: bigint;
  totalDeposits: bigint;
  poolCap: bigint;
};

/** Mirror of the onchain deposit guards (for client-side preflight only). */
export function canDeposit(g: DepositGate): "ok" | "paused" | "amount" | "pool_cap" {
  if (g.paused) return "paused";
  if (g.value !== g.denomination) return "amount";
  if (g.totalDeposits + g.denomination > g.poolCap) return "pool_cap";
  return "ok";
}

/** Keccak incremental Merkle tree mirroring ShieldedPool.sol (depth 20). */
export class MerkleTree {
  private layers: `0x${string}`[][];
  private zeros: `0x${string}`[];

  constructor() {
    this.zeros = [ZERO];
    for (let i = 1; i < SHIELD_TREE_DEPTH; i++) {
      const z = this.zeros[i - 1];
      this.zeros.push(keccak256(encodePacked(["bytes32", "bytes32"], [z, z])));
    }
    this.layers = [[]];
  }

  get size(): number {
    return this.layers[0].length;
  }

  append(leaf: `0x${string}`): number {
    const index = this.size;
    this.layers[0].push(leaf);
    let node = leaf;
    let idx = index;
    for (let level = 0; level < SHIELD_TREE_DEPTH; level++) {
      const layer = (this.layers[level + 1] ??= []);
      if (idx % 2 === 0) {
        node = keccak256(encodePacked(["bytes32", "bytes32"], [node, this.zeros[level]]));
      } else {
        const left = this.layers[level][idx - 1];
        node = keccak256(encodePacked(["bytes32", "bytes32"], [left, node]));
      }
      layer[Math.floor(idx / 2)] = node;
      idx = Math.floor(idx / 2);
    }
    return index;
  }

  root(): `0x${string}` {
    if (this.size === 0) {
      let node = ZERO;
      for (let i = 0; i < SHIELD_TREE_DEPTH; i++) {
        node = keccak256(encodePacked(["bytes32", "bytes32"], [node, this.zeros[i]]));
      }
      return node;
    }
    let node = this.layers[0][this.size - 1];
    let idx = this.size - 1;
    // Walk up using stored parents where available, else zero siblings.
    for (let level = 0; level < SHIELD_TREE_DEPTH; level++) {
      const parentIdx = Math.floor(idx / 2);
      const parent = this.layers[level + 1]?.[parentIdx];
      if (parent !== undefined) {
        node = parent;
      } else if (idx % 2 === 0) {
        node = keccak256(encodePacked(["bytes32", "bytes32"], [node, this.zeros[level]]));
      } else {
        const left = this.layers[level][idx - 1];
        node = keccak256(encodePacked(["bytes32", "bytes32"], [left, node]));
      }
      idx = parentIdx;
    }
    return node;
  }

  proof(index: number): `0x${string}`[] {
    if (index < 0 || index >= this.size) throw new Error("bad_index");
    const siblings: `0x${string}`[] = [];
    let idx = index;
    for (let level = 0; level < SHIELD_TREE_DEPTH; level++) {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      siblings.push(this.layers[level][siblingIdx] ?? this.zeros[level]);
      idx = Math.floor(idx / 2);
    }
    return siblings;
  }

  static verify(
    leaf: `0x${string}`,
    index: number,
    siblings: `0x${string}`[],
    root: `0x${string}`,
  ): boolean {
    if (siblings.length !== SHIELD_TREE_DEPTH) return false;
    let node = leaf;
    let idx = index;
    for (let level = 0; level < SHIELD_TREE_DEPTH; level++) {
      node =
        idx % 2 === 0
          ? keccak256(encodePacked(["bytes32", "bytes32"], [node, siblings[level]]))
          : keccak256(encodePacked(["bytes32", "bytes32"], [siblings[level], node]));
      idx = Math.floor(idx / 2);
    }
    return node.toLowerCase() === root.toLowerCase();
  }
}
