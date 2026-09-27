import { describe, expect, it } from "vitest";
import { assertShieldDeploymentAllowed } from "../scripts/shield-deployment-policy.mjs";

describe("Shield deployment policy", () => {
  it("keeps the deployment helper testnet-only even after verifier review", () => {
    expect(() => assertShieldDeploymentAllowed({ network: "mainnet", rehearsal: true }))
      .toThrow("mainnet_blocked: this deployment helper is testnet-only");
  });

  it("requires an explicit rehearsal acknowledgement before testnet deployment", () => {
    expect(() => assertShieldDeploymentAllowed({ network: "testnet", rehearsal: false }))
      .toThrow("rehearsal_confirmation_required");
    expect(() => assertShieldDeploymentAllowed({ network: "testnet", rehearsal: true })).not.toThrow();
  });
});
