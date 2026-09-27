import { describe, expect, it } from "vitest";
import { buildShieldAssociationSet, buildShieldAssociationProof } from "../lib/shielded-association";

describe("deterministic shield association sets", () => {
  it("produces the same Poseidon LeanIMT root independent of event order", () => {
    const first = buildShieldAssociationSet([11n, 22n, 33n]);
    const second = buildShieldAssociationSet([33n, 11n, 22n]);
    expect(first.root).toBe(second.root);
    expect(first.labels).toEqual(second.labels);
  });

  it("creates membership proofs only for included labels", () => {
    const dataset = buildShieldAssociationSet([11n, 22n]);
    expect(buildShieldAssociationProof(dataset, 22n).root).toBe(dataset.root);
    expect(() => buildShieldAssociationProof(dataset, 99n)).toThrow("shield_asp_label_missing");
  });

  it("rejects duplicate and out-of-field labels", () => {
    expect(() => buildShieldAssociationSet([11n, 11n])).toThrow("shield_asp_duplicate_label");
    expect(() => buildShieldAssociationSet([21888242871839275222246405745257275088548364400416034343698204186575808495617n]))
      .toThrow("shield_asp_label_out_of_range");
  });
});
