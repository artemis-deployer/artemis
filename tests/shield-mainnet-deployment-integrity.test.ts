import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  collectMainnetLibraries,
  MAINNET_DEPLOYMENT_ARTIFACT_HASHES,
  verifyMainnetDeploymentArtifacts,
  verifyMainnetDeploymentState,
  verifyMainnetWalletIdentity,
} from "../lib/shield-mainnet-deployment-integrity.mjs";

const artifacts = Object.fromEntries(Object.keys(MAINNET_DEPLOYMENT_ARTIFACT_HASHES).map((name) => [
  name,
  JSON.parse(readFileSync(new URL(`../artifacts/shielded/0xbow-v1.2.1/${name}.json`, import.meta.url), "utf8")),
]));

const validState = {
  depositsPaused: true,
  activationPending: true,
  guardian: "0x1111111111111111111111111111111111111111",
  expectedGuardian: "0x1111111111111111111111111111111111111111",
  latestRoot: "123",
  expectedRoot: "123",
  associationSetCid: "QmVtkNm5Ro2F1oVBdP17TxcAcafXtMoG8rYPnu7S8kXJxV",
  expectedAssociationSetCid: "QmVtkNm5Ro2F1oVBdP17TxcAcafXtMoG8rYPnu7S8kXJxV",
  ownerStillHeld: false,
  postmanRoleHeld: true,
  denomination: 1000000000000000n,
  lifetimeCap: 10000000000000000000n,
  entrypoint: "0x2222222222222222222222222222222222222222",
  expectedEntrypoint: "0x2222222222222222222222222222222222222222",
  withdrawalVerifier: "0x3333333333333333333333333333333333333333",
  expectedWithdrawalVerifier: "0x3333333333333333333333333333333333333333",
  ragequitVerifier: "0x4444444444444444444444444444444444444444",
  expectedRagequitVerifier: "0x4444444444444444444444444444444444444444",
  asset: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  nativeAsset: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  registeredPool: "0x5555555555555555555555555555555555555555",
  expectedPool: "0x5555555555555555555555555555555555555555",
  minimumDepositAmount: 1000000000000000n,
  vettingFeeBPS: 0n,
  maxRelayFeeBPS: 0n,
  scopedPool: "0x5555555555555555555555555555555555555555",
};

describe("Robinhood mainnet deployment integrity", () => {
  it("requires the deployer, ASP postman, relayer, guardian, and operator to resolve to one wallet", () => {
    const shared = "0x1111111111111111111111111111111111111111";
    const identity = {
      operatorAddress: shared,
      guardianAddress: shared,
      deployerAddress: shared,
      postmanAddress: shared,
      relayerAddress: shared,
    };
    expect(verifyMainnetWalletIdentity(identity)).toBe(true);
    expect(() => verifyMainnetWalletIdentity({ ...identity, relayerAddress: "0x2222222222222222222222222222222222222222" }))
      .toThrow("mainnet_wallet_identity_mismatch");
    expect(() => verifyMainnetWalletIdentity({ ...identity, postmanAddress: undefined }))
      .toThrow("mainnet_wallet_identity_missing_or_invalid");
  });

  it("accepts only the reviewed compiled contract artifacts", () => {
    expect(verifyMainnetDeploymentArtifacts(artifacts)).toBe(true);

    const modified = structuredClone(artifacts);
    modified.WithdrawalVerifier.bytecode += "00";
    expect(() => verifyMainnetDeploymentArtifacts(modified))
      .toThrow("mainnet_deployment_artifact_integrity_mismatch:WithdrawalVerifier");
  });

  it("preserves linked Poseidon library deployments in the published manifest", () => {
    expect(collectMainnetLibraries({
      "library:PoseidonT3": { address: "0x1111111111111111111111111111111111111111" },
      "library:PoseidonT4": { address: "0x2222222222222222222222222222222222222222" },
      withdrawalVerifier: { address: "0x3333333333333333333333333333333333333333" },
    })).toEqual({
      PoseidonT3: { address: "0x1111111111111111111111111111111111111111" },
      PoseidonT4: { address: "0x2222222222222222222222222222222222222222" },
    });
  });

  it("rejects incorrect deployed pool, verifier, cap, or entrypoint registration state", () => {
    expect(verifyMainnetDeploymentState(validState)).toBe(true);
    expect(() => verifyMainnetDeploymentState({ ...validState, lifetimeCap: 1n }))
      .toThrow("mainnet_post_deploy_lifetime_cap_mismatch");
    expect(() => verifyMainnetDeploymentState({ ...validState, registeredPool: validState.entrypoint }))
      .toThrow("mainnet_post_deploy_registered_pool_mismatch");
    expect(() => verifyMainnetDeploymentState({ ...validState, ragequitVerifier: validState.withdrawalVerifier }))
      .toThrow("mainnet_post_deploy_ragequit_verifier_mismatch");
    expect(() => verifyMainnetDeploymentState({ ...validState, associationSetCid: "QmWrongCID" }))
      .toThrow("mainnet_post_deploy_asp_cid_mismatch");
  });
});
