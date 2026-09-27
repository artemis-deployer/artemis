import {
  generateMerkleProof,
  type LeanIMTMerkleProof,
} from "@0xbow/privacy-pools-core-sdk";

export interface ShieldStateLeafEvent {
  kind: "deposit" | "withdrawal";
  commitment: bigint;
  blockNumber: bigint;
  logIndex: number;
}

export interface ShieldStateTree {
  leaves: bigint[];
  root: bigint;
  proof(commitment: bigint): LeanIMTMerkleProof<bigint>;
}

export function buildShieldStateTree(events: ShieldStateLeafEvent[]): ShieldStateTree {
  if (events.length === 0) throw new Error("shield_state_tree_empty");
  const ordered = [...events].sort((left, right) => {
    if (left.blockNumber !== right.blockNumber) return left.blockNumber < right.blockNumber ? -1 : 1;
    return left.logIndex - right.logIndex;
  });
  const seen = new Set<string>();
  const leaves = ordered.map(({ commitment }) => {
    if (commitment <= 0n) throw new Error("shield_state_invalid_commitment");
    const value = commitment.toString();
    if (seen.has(value)) throw new Error("shield_state_duplicate_commitment");
    seen.add(value);
    return commitment;
  });
  const root = BigInt(generateMerkleProof(leaves, leaves[0]).root);
  return {
    leaves,
    root,
    proof(commitment) {
      if (!seen.has(commitment.toString())) throw new Error("shield_state_commitment_missing");
      const proof = generateMerkleProof(leaves, commitment);
      if (BigInt(proof.root) !== root) throw new Error("shield_state_root_mismatch");
      return proof;
    },
  };
}
