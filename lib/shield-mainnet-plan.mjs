import { isAddress, parseEther, zeroAddress } from "viem";

const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const CID_PATTERN = /^(bafy[a-z2-7]{20,59}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/;

export function createShieldMainnetDeploymentPlan({
  operatorAddress,
  guardianAddress = operatorAddress,
  aspRoot,
  aspCid,
  denominationEth = "0.001",
  lifetimeDepositCapEth = "10",
}) {
  if (!isAddress(operatorAddress ?? "") || operatorAddress.toLowerCase() === zeroAddress.toLowerCase()) {
    throw new Error("operator_address_required");
  }
  if (!isAddress(guardianAddress ?? "") || guardianAddress.toLowerCase() === zeroAddress.toLowerCase()) {
    throw new Error("invalid_guardian_address");
  }
  if (!/^\d+$/.test(String(aspRoot)) || BigInt(aspRoot) <= 0n || BigInt(aspRoot) >= FIELD || !CID_PATTERN.test(String(aspCid))) {
    throw new Error("invalid_asp_root");
  }
  if (parseEther(denominationEth) !== parseEther("0.001") || parseEther(lifetimeDepositCapEth) !== parseEther("10")) {
    throw new Error("unsupported_pool_parameters");
  }

  return {
    schemaVersion: 1,
    status: "preflight-only",
    network: "Robinhood Chain",
    chainId: 4663,
    denominationWei: parseEther(denominationEth).toString(),
    lifetimeDepositCapWei: parseEther(lifetimeDepositCapEth).toString(),
    associationSet: { root: String(aspRoot), cid: String(aspCid) },
    operators: {
      deployer: operatorAddress,
      aspPostman: operatorAddress,
      guardian: guardianAddress,
      relayer: operatorAddress,
    },
    deploymentSafety: {
      depositsInitiallyPaused: true,
      activation: "guardian-only-once",
    },
    plannedTransactions: [
      "deploy withdrawal and commitment verifiers from checksum-pinned artifacts",
      "deploy Poseidon libraries, Entrypoint implementation, and initialize proxy",
      "deploy ArtemisMainnetPrivacyPoolSimple paused and register 0.001 ETH native asset",
      "set verified genesis association root and CID",
      "renounce Entrypoint owner role and verify remaining postman/guardian roles",
    ],
    laterActivation: "guardian calls activateDeposits once after deployment verification; guardian pause stays irreversible",
    featureFlags: { enabled: false, depositEnabled: false, withdrawEnabled: false },
    broadcast: false,
    broadcastDefault: false,
    broadcastRequires: ["--mainnet", "--broadcast", "--i-understand-mainnet-broadcast", "SHIELD_MAINNET_BROADCAST_ENABLED=true"],
    blockingRequirements: [
      "mainnet operator wallet must have enough ETH for the measured deployment and configuration gas",
      "owner must explicitly authorize a separate mainnet broadcast after the deployment plan is reviewed",
      "keep deposits paused until the pool, ASP publisher, indexer, relayer, and UI checks are complete",
    ],
  };
}
