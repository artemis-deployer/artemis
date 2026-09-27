import {
  generateMerkleProof,
  type LeanIMTMerkleProof,
} from "@0xbow/privacy-pools-core-sdk";

export const SHIELD_SNARK_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
export const SHIELD_ASP_SENTINEL_LABEL = SHIELD_SNARK_FIELD - 1n;

export interface ShieldAssociationSet {
  labels: bigint[];
  root: bigint;
}

export function buildShieldAssociationSet(inputLabels: bigint[]): ShieldAssociationSet {
  const seen = new Set<string>();
  for (const label of inputLabels) {
    if (label < 0n || label >= SHIELD_SNARK_FIELD) throw new Error("shield_asp_label_out_of_range");
    if (seen.has(label.toString())) throw new Error("shield_asp_duplicate_label");
    seen.add(label.toString());
  }

  const labels = [...inputLabels, ...(seen.has(SHIELD_ASP_SENTINEL_LABEL.toString()) ? [] : [SHIELD_ASP_SENTINEL_LABEL])]
    .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const proof = generateMerkleProof(labels, labels[0]);
  const root = BigInt(proof.root);
  if (root <= 0n || root >= SHIELD_SNARK_FIELD) throw new Error("shield_asp_invalid_root");
  return { labels, root };
}

export function buildShieldAssociationProof(
  set: ShieldAssociationSet,
  label: bigint,
): LeanIMTMerkleProof<bigint> {
  if (!set.labels.includes(label)) throw new Error("shield_asp_label_missing");
  const proof = generateMerkleProof(set.labels, label);
  if (BigInt(proof.root) !== set.root) throw new Error("shield_asp_root_mismatch");
  return proof;
}
