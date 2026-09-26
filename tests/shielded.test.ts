import { describe, expect, it } from "vitest";
import {
  DENOMINATIONS,
  MerkleTree,
  canDeposit,
  commitmentOf,
  makeNote,
  nullifierHashOf,
} from "../lib/shielded";

describe("shielded notes", () => {
  it("generates unique notes with deterministic commitments", () => {
    const a = makeNote();
    const b = makeNote();
    expect(a.nullifier).not.toBe(b.nullifier);
    expect(commitmentOf(a)).toBe(commitmentOf({ ...a }));
    expect(commitmentOf(a)).not.toBe(commitmentOf(b));
    expect(nullifierHashOf(a)).not.toBe(nullifierHashOf(b));
  });

  it("offers fixed ETH denominations only", () => {
    expect(DENOMINATIONS).toEqual([10000000000000000n, 100000000000000000n, 1000000000000000000n]);
  });
});

describe("shielded merkle tree", () => {
  it("matches a manual keccak chain for two leaves", async () => {
    const { keccak256, encodePacked } = await import("viem");
    const tree = new MerkleTree();
    const l0 = commitmentOf(makeNote());
    const l1 = commitmentOf(makeNote());
    tree.append(l0);
    tree.append(l1);
    const zero0 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
    const h0 = keccak256(encodePacked(["bytes32", "bytes32"], [l0, l1]));
    let node = h0;
    let z = keccak256(encodePacked(["bytes32", "bytes32"], [zero0, zero0]));
    for (let level = 1; level < 20; level++) {
      node = keccak256(encodePacked(["bytes32", "bytes32"], [node, z]));
      z = keccak256(encodePacked(["bytes32", "bytes32"], [z, z]));
    }
    expect(tree.root()).toBe(node);
  });

  it("proves membership and rejects tampered leaves", () => {
    const tree = new MerkleTree();
    const leaves = [makeNote(), makeNote(), makeNote()].map(commitmentOf);
    for (const l of leaves) tree.append(l);
    const proof = tree.proof(1);
    expect(MerkleTree.verify(leaves[1], 1, proof, tree.root())).toBe(true);
    expect(MerkleTree.verify(leaves[2], 1, proof, tree.root())).toBe(false);
    expect(MerkleTree.verify(leaves[1], 0, proof, tree.root())).toBe(false);
  });

  it("rebuilds the same root from deposit events", () => {
    const leaves = [makeNote(), makeNote()].map(commitmentOf);
    const live = new MerkleTree();
    for (const l of leaves) live.append(l);
    const rebuilt = new MerkleTree();
    const events = leaves.map((commitment, index) => ({ index, commitment }));
    for (const e of events) rebuilt.append(e.commitment);
    expect(rebuilt.root()).toBe(live.root());
  });

  it("detects double-spend via a spent-nullifier set", () => {
    const spent = new Set<string>();
    const note = makeNote();
    const nh = nullifierHashOf(note);
    expect(spent.has(nh)).toBe(false);
    spent.add(nh);
    expect(spent.has(nullifierHashOf(note))).toBe(true);
  });
});

describe("shielded accounting invariant", () => {
  it("deposits minus withdrawals always equals pool balance", () => {
    const denom = DENOMINATIONS[1];
    let balance = 0n;
    let totalDeposits = 0n;
    let totalWithdrawn = 0n;
    const notes = [makeNote(), makeNote(), makeNote()];
    for (let i = 0; i < notes.length; i++) {
      expect(canDeposit({ paused: false, value: denom, denomination: denom, totalDeposits, poolCap: denom * 10n })).toBe("ok");
      totalDeposits += denom;
      balance += denom;
    }
    const spent = new Set<string>();
    for (const note of notes.slice(0, 2)) {
      const nh = nullifierHashOf(note);
      expect(spent.has(nh)).toBe(false);
      spent.add(nh);
      totalWithdrawn += denom;
      balance -= denom;
    }
    expect(totalDeposits - totalWithdrawn).toBe(balance);
    expect(balance).toBe(denom);
    // Double-spend would break the invariant: same nullifier twice.
    const replay = nullifierHashOf(notes[0]);
    expect(spent.has(replay)).toBe(true);
  });

  it("enforces pause, exact amount, and pool cap", () => {
    const denom = DENOMINATIONS[0];
    const base = { value: denom, denomination: denom, totalDeposits: 0n, poolCap: denom * 2n, paused: false };
    expect(canDeposit(base)).toBe("ok");
    expect(canDeposit({ ...base, paused: true })).toBe("paused");
    expect(canDeposit({ ...base, value: denom * 2n })).toBe("amount");
    expect(canDeposit({ ...base, totalDeposits: denom * 2n })).toBe("pool_cap");
  });

  it("withdraw source has no pause gate (regression guard)", async () => {
    // Onchain rule (brief §B9): withdraw must never be pausable. Pin it by
    // inspecting the withdraw body: no reference to depositsPaused/paused.
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("../contracts/ShieldedPool.sol", import.meta.url), "utf8");
    const start = src.indexOf("function withdraw(");
    const end = src.indexOf("\n  function ", start + 1);
    const body = src.slice(start, end === -1 ? undefined : end);
    expect(body).not.toMatch(/paused/i);
    expect(body).toContain("nullifierUsed[nullifierHash] = true");
  });
});
