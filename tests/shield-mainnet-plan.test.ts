import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createShieldMainnetDeploymentPlan } from "../lib/shield-mainnet-plan.mjs";

describe("Shield mainnet deployment plan", () => {
  it("prepares a one-wallet 0.001 ETH / 10 ETH deployment without enabling feature flags", () => {
    const plan = createShieldMainnetDeploymentPlan({
      operatorAddress: "0x1111111111111111111111111111111111111111",
      aspRoot: "1",
      aspCid: "QmPVzXKgUMaH1U8fqSJY9ntGo4XjupPBcfVvt6k8juCB7h",
    });
    expect(plan).toMatchObject({
      chainId: 4663,
      denominationWei: "1000000000000000",
      lifetimeDepositCapWei: "10000000000000000000",
      operators: { deployer: "0x1111111111111111111111111111111111111111", aspPostman: "0x1111111111111111111111111111111111111111", guardian: "0x1111111111111111111111111111111111111111", relayer: "0x1111111111111111111111111111111111111111" },
      featureFlags: { enabled: false, depositEnabled: false, withdrawEnabled: false },
      deploymentSafety: {
        depositsInitiallyPaused: true,
        activation: "guardian-only-once",
      },
      broadcast: false,
    });
  });

  it("rejects missing operator, invalid association root, and parameters outside the approved rehearsal values", () => {
    expect(() => createShieldMainnetDeploymentPlan({ operatorAddress: "", aspRoot: "1", aspCid: "QmPVzXKgUMaH1U8fqSJY9ntGo4XjupPBcfVvt6k8juCB7h" })).toThrow("operator_address_required");
    expect(() => createShieldMainnetDeploymentPlan({ operatorAddress: "0x1111111111111111111111111111111111111111", aspRoot: "0", aspCid: "QmPVzXKgUMaH1U8fqSJY9ntGo4XjupPBcfVvt6k8juCB7h" })).toThrow("invalid_asp_root");
    expect(() => createShieldMainnetDeploymentPlan({ operatorAddress: "0x1111111111111111111111111111111111111111", aspRoot: "1", aspCid: "QmPVzXKgUMaH1U8fqSJY9ntGo4XjupPBcfVvt6k8juCB7h", denominationEth: "0.1" })).toThrow("unsupported_pool_parameters");
  });

  it("keeps the mainnet preflight strictly read-only", () => {
    const source = readFileSync(new URL("../scripts/shield/prepare-mainnet-deployment.mjs", import.meta.url), "utf8");
    expect(source).toContain("--dry-run");
    expect(source).not.toMatch(/createWalletClient|writeContract|deployContract|privateKeyToAccount/);
  });
});
