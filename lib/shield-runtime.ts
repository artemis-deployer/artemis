import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, defineChain, http, isAddress, keccak256, parseEther, toBytes, zeroAddress, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { shieldNetworkForChainId, shieldNetworkFromManifest } from "./shield-networks";

function enabled(env: NodeJS.ProcessEnv, name: string): boolean {
  const value = (env[name] ?? "").trim().toLowerCase();
  return value === "1" || value === "true";
}

export function isShieldPoolActivated(chainId: number, depositsPaused: boolean, activationPending: boolean): boolean {
  return chainId !== 4663 || (!depositsPaused && !activationPending);
}

export function resolveShieldRelayer(env: NodeJS.ProcessEnv): { privateKey: `0x${string}`; address: Address } | null {
  const mainnet = env.SHIELD_CHAIN_ID === "4663";
  const key = (mainnet
    ? env.SHIELD_MAINNET_RELAYER_PRIVATE_KEY || env.SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY || ""
    : env.SHIELD_RELAYER_PRIVATE_KEY || env.SHIELD_DEPLOYER_PRIVATE_KEY || "").trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) return null;
  const account = privateKeyToAccount(key as `0x${string}`);
  const configuredAddress = (mainnet
    ? env.SHIELD_MAINNET_RELAYER_ADDRESS || env.SHIELD_OPERATOR_ADDRESS || account.address
    : env.SHIELD_RELAYER_ADDRESS || account.address).trim();
  if (!isAddress(configuredAddress) || configuredAddress.toLowerCase() !== account.address.toLowerCase()) return null;
  return { privateKey: key as `0x${string}`, address: account.address };
}

export function resolveShieldGates(env: NodeJS.ProcessEnv, deploymentValid: boolean, relayerConfigured = true) {
  const supportedNetwork = shieldNetworkForChainId(env.SHIELD_CHAIN_ID);
  const enabledFlag = enabled(env, "SHIELD_ENABLED");
  const mainnetVerifierReady = supportedNetwork?.id !== 4663 || enabled(env, "SHIELD_MAINNET_VERIFIER_READY");
  const protocolReady = Boolean(supportedNetwork) && mainnetVerifierReady && deploymentValid && enabledFlag;
  const clientReady = enabled(env, "SHIELD_CLIENT_READY");
  const indexerReady = enabled(env, "SHIELD_INDEXER_READY");
  const relayerReady = enabled(env, "SHIELD_RELAYER_READY");
  const rehearsalComplete = enabled(env, "SHIELD_REHEARSAL_COMPLETE");

  return {
    enabled: protocolReady,
    depositEnabled: protocolReady && enabled(env, "SHIELD_DEPOSIT_ENABLED") && clientReady && indexerReady && rehearsalComplete,
    withdrawEnabled: protocolReady && enabled(env, "SHIELD_WITHDRAW_ENABLED") && clientReady && indexerReady && relayerReady && rehearsalComplete && relayerConfigured,
  };
}

export interface ShieldRuntimeStatus {
  configured: boolean;
  reason: string;
  enabled: boolean;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  chainId?: number;
  rpcUrl?: string;
  entrypoint?: Address;
  pool?: Address;
  deploymentBlock?: string;
  entrypointDeploymentBlock?: string;
  scope?: string;
  denominationWei?: string;
  lifetimeDepositCapWei?: string;
  latestAssociationRoot?: string;
  guardian?: string;
  relayerAddress?: Address;
}

export async function getShieldRuntimeStatus(): Promise<ShieldRuntimeStatus> {
  const disabled = { enabled: false, depositEnabled: false, withdrawEnabled: false };
  const network = shieldNetworkForChainId(process.env.SHIELD_CHAIN_ID);
  if (!network) return { ...disabled, configured: false, reason: "unsupported_chain" };
  const networkKey = network.id === 4663 ? "MAINNET" : "TESTNET";
  const rpcUrl = process.env[`SHIELD_${networkKey}_RPC_URL`] || process.env.SHIELD_RPC_URL || network.defaultRpcUrl;
  const manifestName = (
    process.env[`SHIELD_${networkKey}_DEPLOYMENT_MANIFEST`] || process.env.SHIELD_DEPLOYMENT_MANIFEST || network.defaultManifest
  ).trim();
  if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) return { ...disabled, configured: false, reason: "deployment_manifest_invalid" };
  const manifestPath = join(process.cwd(), "deployments", manifestName);
  if (!existsSync(manifestPath)) return { ...disabled, configured: false, reason: "deployment_manifest_missing" };

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const manifestEntrypoint = manifest.contracts?.entrypointProxy?.address;
    const manifestPool = manifest.contracts?.pool?.address;
    const manifestWithdrawalVerifier = manifest.contracts?.withdrawalVerifier?.address;
    const manifestCommitmentVerifier = manifest.contracts?.commitmentVerifier?.address;
    const entrypoint = process.env.SHIELD_ENTRYPOINT_ADDRESS || manifestEntrypoint;
    const pool = process.env.SHIELD_POOL_ADDRESS || manifestPool;
    if (shieldNetworkFromManifest(manifest)?.id !== network.id || !isAddress(entrypoint) || !isAddress(pool) || !isAddress(manifestWithdrawalVerifier) || !isAddress(manifestCommitmentVerifier) || !isAddress(manifest.deployer) || !isAddress(manifest.aspPostman) || !isAddress(manifest.guardian)) {
      return { ...disabled, configured: false, reason: "deployment_manifest_invalid" };
    }
    if (entrypoint.toLowerCase() !== manifestEntrypoint.toLowerCase() || pool.toLowerCase() !== manifestPool.toLowerCase()) {
      return { ...disabled, configured: false, reason: "deployment_manifest_address_mismatch" };
    }
    const relayer = resolveShieldRelayer(process.env);
    const relayerConfigured = Boolean(relayer);

    const artifactDir = join(process.cwd(), "artifacts/shielded/0xbow-v1.2.1");
    const entrypointAbi = JSON.parse(readFileSync(join(artifactDir, "Entrypoint.json"), "utf8")).abi;
    const poolAbiFile = network.id === 4663 ? "ArtemisMainnetPrivacyPoolSimple.json" : "PrivacyPoolSimple.json";
    const poolAbi = JSON.parse(readFileSync(join(artifactDir, poolAbiFile), "utf8")).abi;
    const ownerRole = keccak256(toBytes("OWNER_ROLE"));
    const postmanRole = keccak256(toBytes("ASP_POSTMAN"));
    const chain = defineChain({
      id: network.id,
      name: network.name,
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [rpcUrl] } },
    });
    const client = createPublicClient({ chain, transport: http(rpcUrl) });
    if (await client.getChainId() !== network.id) throw new Error("chain_id_mismatch");
    const [entrypointCode, poolCode, withdrawalVerifierCode, ragequitVerifierCode, configuredPool, withdrawalVerifier, ragequitVerifier, asset, denominationValue, capValue, guardian, scopeValue, rootValue, assetConfig, ownerStillHeld, postmanRoleHeld] = await Promise.all([
      client.getCode({ address: entrypoint }),
      client.getCode({ address: pool }),
      client.getCode({ address: manifestWithdrawalVerifier }),
      client.getCode({ address: manifestCommitmentVerifier }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "ENTRYPOINT" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "WITHDRAWAL_VERIFIER" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "RAGEQUIT_VERIFIER" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "ASSET" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "DEPOSIT_DENOMINATION" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "LIFETIME_DEPOSIT_CAP" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "guardian" }),
      client.readContract({ address: pool, abi: poolAbi, functionName: "SCOPE" }),
      client.readContract({ address: entrypoint, abi: entrypointAbi, functionName: "latestRoot" }),
      client.readContract({ address: entrypoint, abi: entrypointAbi, functionName: "assetConfig", args: ["0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"] }),
      client.readContract({ address: entrypoint, abi: entrypointAbi, functionName: "hasRole", args: [ownerRole, manifest.deployer] }),
      client.readContract({ address: entrypoint, abi: entrypointAbi, functionName: "hasRole", args: [postmanRole, manifest.aspPostman] }),
    ]);
    const mainnetActivation = network.id === 4663
      ? await Promise.all([
          client.readContract({ address: pool, abi: poolAbi, functionName: "depositsPaused" }),
          client.readContract({ address: pool, abi: poolAbi, functionName: "activationPending" }),
        ])
      : [false, false];
    const [depositsPaused, activationPending] = mainnetActivation as [boolean, boolean];
    const denomination = BigInt(denominationValue as bigint);
    const cap = BigInt(capValue as bigint);
    const scope = BigInt(scopeValue as bigint);
    const root = BigInt(rootValue as bigint);
    const [registeredPool, minDeposit, vettingFee, relayFee] = assetConfig as readonly [string, bigint, bigint, bigint];
    const deploymentValid = Boolean(
      entrypointCode && entrypointCode !== "0x" && poolCode && poolCode !== "0x" &&
      withdrawalVerifierCode && withdrawalVerifierCode !== "0x" && ragequitVerifierCode && ragequitVerifierCode !== "0x" &&
      String(withdrawalVerifier).toLowerCase() === manifestWithdrawalVerifier.toLowerCase() &&
      String(ragequitVerifier).toLowerCase() === manifestCommitmentVerifier.toLowerCase() &&
      String(configuredPool).toLowerCase() === entrypoint.toLowerCase() &&
      String(registeredPool).toLowerCase() === pool.toLowerCase() &&
      String(asset).toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" &&
      denomination === parseEther("0.001") && cap === parseEther("10") &&
      guardian !== zeroAddress && String(guardian).toLowerCase() === String(manifest.guardian).toLowerCase() &&
      !ownerStillHeld && postmanRoleHeld && root > 0n && minDeposit === parseEther("0.001") &&
      vettingFee === 0n && relayFee === 0n && isShieldPoolActivated(network.id, depositsPaused, activationPending),
    );
    const gates = resolveShieldGates(process.env, deploymentValid, relayerConfigured);
    return {
      ...gates,
      configured: deploymentValid,
      reason: deploymentValid ? "ready" : "onchain_configuration_mismatch",
      chainId: network.id,
      rpcUrl,
      entrypoint,
      pool,
      deploymentBlock: manifest.poolDeploymentBlock,
      entrypointDeploymentBlock: manifest.entrypointDeploymentBlock,
      scope: String(scope),
      denominationWei: String(denomination),
      lifetimeDepositCapWei: String(cap),
      latestAssociationRoot: String(root),
      guardian: String(guardian),
      ...(relayer ? { relayerAddress: relayer.address } : {}),
    };
  } catch {
    return { ...disabled, configured: false, reason: "deployment_unavailable" };
  }
}
