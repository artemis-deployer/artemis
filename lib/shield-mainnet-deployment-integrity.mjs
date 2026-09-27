import { createHash } from "node:crypto";
import { parseEther } from "viem";

export const MAINNET_DEPLOYMENT_ARTIFACT_HASHES = Object.freeze({
  WithdrawalVerifier: "070bd4b63934f1e4739e6c5b01c8dd74e02aefa9c1e7a459c53691a48bac1678",
  CommitmentVerifier: "8888c41d6d04cc16eb4fe42773daa0a4009e9124eaec054f7a0c8c91ee44b491",
  Entrypoint: "0ace8ef52d2aed877ad972e4307d5ed05c063a0552bbb6abbd3f5b834e3a0a11",
  ERC1967Proxy: "15d76550a85ab19558be81e030fc5a35eac5553a6aff94ada35c0f0c765543c9",
  ArtemisMainnetPrivacyPoolSimple: "3a944cd42744cf86d3764fe4ff268a0dc47663c9e6f75dc158c2a8bf698d5db5",
  PoseidonT3: "82ad264c04b5f3719642d626d855222fba02d9037f14127ccb7b66d0ccc9a92e",
  PoseidonT4: "5fc6a74462b75d71db2680c2b956d0b98bd738e4f2b7c1eef2c18e69d648b574",
});

const digestArtifact = (artifact) => createHash("sha256").update(JSON.stringify({
  contractName: artifact.contractName,
  outputName: artifact.outputName,
  sourceName: artifact.sourceName,
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  linkReferences: artifact.linkReferences,
  metadata: artifact.metadata,
})).digest("hex");

export function verifyMainnetDeploymentArtifacts(artifacts) {
  for (const [name, expectedHash] of Object.entries(MAINNET_DEPLOYMENT_ARTIFACT_HASHES)) {
    const artifact = artifacts[name];
    if (!artifact || digestArtifact(artifact) !== expectedHash) {
      throw new Error(`mainnet_deployment_artifact_integrity_mismatch:${name}`);
    }
  }
  return true;
}

export function collectMainnetLibraries(contracts) {
  return Object.fromEntries(Object.entries(contracts)
    .filter(([key]) => key.startsWith("library:") && contracts[key]?.address)
    .map(([key, deployment]) => [key.slice("library:".length), deployment]));
}

export function verifyMainnetWalletIdentity({
  operatorAddress,
  guardianAddress,
  deployerAddress,
  postmanAddress,
  relayerAddress,
}) {
  const addresses = { operatorAddress, guardianAddress, deployerAddress, postmanAddress, relayerAddress };
  const isAddress = (value) => /^0x[\da-f]{40}$/i.test(String(value));
  if (Object.values(addresses).some((address) => !isAddress(address))) {
    throw new Error("mainnet_wallet_identity_missing_or_invalid");
  }
  const expected = operatorAddress.toLowerCase();
  if (Object.entries(addresses).some(([, address]) => address.toLowerCase() !== expected)) {
    throw new Error("mainnet_wallet_identity_mismatch");
  }
  return true;
}

const sameAddress = (left, right) => String(left).toLowerCase() === String(right).toLowerCase();

export function verifyMainnetDeploymentState(state) {
  const fail = (reason) => { throw new Error(`mainnet_post_deploy_${reason}`); };
  if (!state.depositsPaused || !state.activationPending) fail("pool_not_safely_paused");
  if (!sameAddress(state.guardian, state.expectedGuardian)) fail("guardian_mismatch");
  if (BigInt(state.latestRoot) !== BigInt(state.expectedRoot)) fail("asp_root_mismatch");
  if (state.associationSetCid !== state.expectedAssociationSetCid) fail("asp_cid_mismatch");
  if (state.ownerStillHeld || !state.postmanRoleHeld) fail("entrypoint_roles_mismatch");
  if (BigInt(state.denomination) !== parseEther("0.001")) fail("denomination_mismatch");
  if (BigInt(state.lifetimeCap) !== parseEther("10")) fail("lifetime_cap_mismatch");
  if (!sameAddress(state.entrypoint, state.expectedEntrypoint)) fail("pool_entrypoint_mismatch");
  if (!sameAddress(state.withdrawalVerifier, state.expectedWithdrawalVerifier)) fail("withdrawal_verifier_mismatch");
  if (!sameAddress(state.ragequitVerifier, state.expectedRagequitVerifier)) fail("ragequit_verifier_mismatch");
  if (!sameAddress(state.asset, state.nativeAsset)) fail("pool_asset_mismatch");
  if (!sameAddress(state.registeredPool, state.expectedPool)) fail("registered_pool_mismatch");
  if (BigInt(state.minimumDepositAmount) !== parseEther("0.001")) fail("minimum_deposit_mismatch");
  if (BigInt(state.vettingFeeBPS) !== 0n || BigInt(state.maxRelayFeeBPS) !== 0n) fail("pool_fee_mismatch");
  if (!sameAddress(state.scopedPool, state.expectedPool)) fail("scope_registration_mismatch");
  return true;
}
