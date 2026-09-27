import { describe, expect, it } from "vitest";
import { buildShieldStateTree } from "../lib/shielded-state-tree";

describe("shield pool state reconstruction", () => {
  const events = [
    { kind: "deposit" as const, commitment: 10n, blockNumber: 2n, logIndex: 0 },
    { kind: "withdrawal" as const, commitment: 30n, blockNumber: 4n, logIndex: 1 },
    { kind: "deposit" as const, commitment: 20n, blockNumber: 3n, logIndex: 0 },
  ];

  it("orders append-only leaves by block and log position and proves membership", () => {
    const tree = buildShieldStateTree([...events].reverse());
    expect(tree.leaves).toEqual([10n, 20n, 30n]);
    expect(tree.proof(20n).root).toBe(tree.root);
  });

  it("rejects duplicate leaves and missing commitments", () => {
    expect(() => buildShieldStateTree([events[0], events[0]])).toThrow("shield_state_duplicate_commitment");
    expect(() => buildShieldStateTree(events).proof(99n)).toThrow("shield_state_commitment_missing");
  });
});
