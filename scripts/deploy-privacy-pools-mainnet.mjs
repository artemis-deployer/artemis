import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeDeployData,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createShieldMainnetDeploymentPlan } from "../lib/shield-mainnet-plan.mjs";
import {
  collectMainnetLibraries,
  verifyMainnetDeploymentArtifacts,
  verifyMainnetDeploymentState,
  verifyMainnetWalletIdentity,
} from "../lib/shield-mainnet-deployment-integrity.mjs";
import { resolveMainnetDeploymentMode } from "./shield-mainnet-deployment-policy.mjs";
import { assertSafeMainnetRpc } from "./shield-mainnet-rpc-policy.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
if (!args.includes("--mainnet")) throw new Error("Pass --mainnet; this script only targets Robinhood Chain.");
const compileOutput = execFileSync(process.execPath, [join(root, "scripts/compile-privacy-pools.mjs")], {
  cwd: root,
  encoding: "utf8",
});
if (!compileOutput.includes("solc 0.8.28+commit.7893614a")) {
  throw new Error("Mainnet deployment requires the pinned Solidity 0.8.28 compiler.");
}
const localForkSimulation = args.includes("--local-fork-simulation");
if (localForkSimulation && !args.includes("--broadcast")) {
  throw new Error("--local-fork-simulation requires the broadcast flow to exercise the full deployment locally.");
}
const rpcUrl = assertSafeMainnetRpc(
  (process.env.SHIELD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com").trim(),
  localForkSimulation,
);

const operatorAddress = (process.env.SHIELD_OPERATOR_ADDRESS || "").trim();
const guardianAddress = (process.env.SHIELD_MAINNET_GUARDIAN_ADDRESS || operatorAddress).trim();
const aspRoot = (process.env.SHIELD_MAINNET_ASP_ROOT || "").trim();
const aspCid = (process.env.SHIELD_MAINNET_ASP_CID || "").trim();
const plan = createShieldMainnetDeploymentPlan({ operatorAddress, guardianAddress, aspRoot, aspCid });
if (guardianAddress.toLowerCase() !== operatorAddress.toLowerCase()) {
  throw new Error("The approved one-wallet deployment requires guardian and operator addresses to match.");
}
const artifactsDir = join(root, "artifacts/shielded/0xbow-v1.2.1");
const artifact = (name) => {
  const path = join(artifactsDir, `${name}.json`);
  if (!existsSync(path)) throw new Error(`Missing compiled artifact ${name}; run npm run compile:privacy-pools first.`);
  return JSON.parse(readFileSync(path, "utf8"));
};
const expectedPoolArtifact = artifact("ArtemisMainnetPrivacyPoolSimple");
if (!expectedPoolArtifact.abi.some((entry) => entry.name === "activateDeposits")) {
  throw new Error("Mainnet pool artifact is missing its one-time activation hook.");
}
const artifactNames = ["WithdrawalVerifier", "CommitmentVerifier", "Entrypoint", "ERC1967Proxy", "ArtemisMainnetPrivacyPoolSimple", "PoseidonT3", "PoseidonT4"];
const deploymentArtifacts = Object.fromEntries(artifactNames.map((name) => [name, artifact(name)]));
verifyMainnetDeploymentArtifacts(deploymentArtifacts);
const artifactSummary = artifactNames.map((name) => {
  const value = deploymentArtifacts[name];
  return { name, creationBytecodeBytes: (value.bytecode.length - 2) / 2, sha256: createHash("sha256").update(value.bytecode).digest("hex") };
});

const sentinel = "21888242871839275222246405745257275088548364400416034343698204186575808495616";
const gateway = (process.env.SHIELD_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");
const aspResponse = await fetch(`${gateway}/${encodeURIComponent(aspCid)}`, {
  cache: "no-store",
  signal: AbortSignal.timeout(15_000),
});
if (!aspResponse.ok) throw new Error("Mainnet genesis ASP is unavailable from the configured IPFS gateway.");
const asp = await aspResponse.json();
if (
  asp.chainId !== 4663 || asp.protocol !== "0xbow-privacy-pools-core-v1.2.1" ||
  String(asp.root) !== aspRoot || aspRoot !== sentinel || String(asp.snapshotBlock) !== "0" ||
  !Array.isArray(asp.labels) || asp.labels.length !== 1 || String(asp.labels[0]) !== sentinel
) throw new Error("Mainnet genesis ASP does not match the verified sentinel-only dataset.");

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const publicClient = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 20_000, retryCount: 2 }) });
const [chainId, blockNumber, gasPrice, balance] = await Promise.all([
  publicClient.getChainId(),
  publicClient.getBlockNumber(),
  publicClient.getGasPrice(),
  publicClient.getBalance({ address: operatorAddress }),
]);
if (chainId !== 4663) throw new Error(`Mainnet RPC chain ID mismatch: expected 4663, received ${chainId}.`);

const key = (process.env.SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY || "").trim();
const isPrivateKey = (value) => /^0x[0-9a-fA-F]{64}$/.test(value);
if (key && !isPrivateKey(key)) throw new Error("SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY is invalid.");
if (args.includes("--broadcast") && !isPrivateKey(key)) {
  throw new Error("Set SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY in .env.local for an explicitly authorized broadcast.");
}
const account = isPrivateKey(key) ? privateKeyToAccount(key) : undefined;
const postmanKey = (process.env.SHIELD_MAINNET_POSTMAN_PRIVATE_KEY || key).trim();
const relayerKey = (process.env.SHIELD_MAINNET_RELAYER_PRIVATE_KEY || key).trim();
if (postmanKey && !isPrivateKey(postmanKey)) throw new Error("SHIELD_MAINNET_POSTMAN_PRIVATE_KEY is invalid.");
if (relayerKey && !isPrivateKey(relayerKey)) throw new Error("SHIELD_MAINNET_RELAYER_PRIVATE_KEY is invalid.");
const postmanAccount = isPrivateKey(postmanKey) ? privateKeyToAccount(postmanKey) : undefined;
const relayerAccount = isPrivateKey(relayerKey) ? privateKeyToAccount(relayerKey) : undefined;
const identityConfigured = Boolean(account || postmanAccount || relayerAccount);
if (identityConfigured) {
  verifyMainnetWalletIdentity({
    operatorAddress,
    guardianAddress,
    deployerAddress: account?.address,
    postmanAddress: postmanAccount?.address,
    relayerAddress: relayerAccount?.address,
  });
}
if (args.includes("--broadcast") && !identityConfigured) {
  throw new Error("All one-wallet mainnet signing roles must resolve from configured private keys.");
}
const mode = resolveMainnetDeploymentMode({
  args,
  env: process.env,
  chainId,
  verifierReady: process.env.SHIELD_MAINNET_VERIFIER_READY === "true",
  configuredOperator: operatorAddress,
  signerAddress: account?.address || "",
});

if (!mode.broadcast) {
  console.log(JSON.stringify({
    ...plan,
    broadcast: false,
    preflight: {
      rpcChainId: chainId,
      observedHead: blockNumber.toString(),
      operatorBalanceEth: formatEther(balance),
      gasPriceWei: gasPrice.toString(),
      poolStartsPaused: true,
      activationSent: false,
      oneWalletIdentityVerified: identityConfigured,
      mainnetTransactionsSent: 0,
    },
    artifacts: artifactSummary,
  }, null, 2));
  process.exit(0);
}

if (!account || !postmanAccount) throw new Error("The one-wallet mainnet signer configuration is incomplete.");

const manifestName = (process.env.SHIELD_MAINNET_DEPLOYMENT_MANIFEST || "robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json").trim();
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("Invalid mainnet manifest filename.");
const manifestPath = join(root, "deployments", manifestName);
const checkpointPath = manifestPath.replace(/\.json$/i, ".pending.json");
if (existsSync(manifestPath)) throw new Error(`Mainnet manifest already exists; inspect it before deploying again: ${manifestPath}`);

const wallet = createWalletClient({ account, chain, transport: http(rpcUrl, { timeout: 30_000, retryCount: 0 }) });
const postmanWallet = createWalletClient({ account: postmanAccount, chain, transport: http(rpcUrl, { timeout: 30_000, retryCount: 0 }) });
const checkpoint = existsSync(checkpointPath)
  ? JSON.parse(readFileSync(checkpointPath, "utf8"))
  : {
      schemaVersion: 1,
      chainId: 4663,
      deployer: account.address,
      aspPostman: postmanAccount.address,
      guardian: guardianAddress,
      associationSet: { root: aspRoot, cid: aspCid },
      contracts: { libraries: {} },
      transactions: {},
    };
checkpoint.contracts ??= {};
checkpoint.contracts.libraries ??= {};
checkpoint.transactions ??= {};
if (
  checkpoint.chainId !== 4663 || checkpoint.deployer?.toLowerCase() !== account.address.toLowerCase() ||
  checkpoint.aspPostman?.toLowerCase() !== postmanAccount.address.toLowerCase() ||
  checkpoint.guardian?.toLowerCase() !== guardianAddress.toLowerCase() ||
  checkpoint.associationSet?.root !== aspRoot || checkpoint.associationSet?.cid !== aspCid
) throw new Error("Mainnet deployment checkpoint has different wallet or ASP settings; inspect it before continuing.");
const saveCheckpoint = () => writeFileSync(checkpointPath, `${JSON.stringify(checkpoint, null, 2)}\n`);

async function estimate(tx) {
  const gas = await publicClient.estimateGas({ account: account.address, ...tx });
  const currentGasPrice = await publicClient.getGasPrice();
  const bufferedCost = gas * currentGasPrice * 120n / 100n;
  const currentBalance = await publicClient.getBalance({ address: account.address });
  if (currentBalance < bufferedCost) {
    throw new Error(`Insufficient mainnet balance for next transaction: estimate ${formatEther(bufferedCost)} ETH including 20% buffer; available ${formatEther(currentBalance)} ETH.`);
  }
  return gas;
}

async function deploy(name, constructorArgs = [], checkpointKey = name) {
  const saved = checkpoint.contracts[checkpointKey];
  if (saved?.address) {
    const code = await publicClient.getCode({ address: saved.address });
    if (code && code !== "0x") return saved;
    throw new Error(`Saved ${name} address has no deployed code; inspect ${checkpointPath}.`);
  }
  const item = artifact(name);
  const bytecode = await linkBytecode(item);
  const data = encodeDeployData({ abi: item.abi, bytecode, args: constructorArgs });
  const gas = await estimate({ data });
  const hash = await wallet.deployContract({ abi: item.abi, bytecode, args: constructorArgs, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${name} deployment failed: ${hash}`);
  const result = { address: receipt.contractAddress, transactionHash: hash, blockNumber: receipt.blockNumber.toString() };
  checkpoint.contracts[checkpointKey] = result;
  saveCheckpoint();
  console.log(`${name} deployed: ${result.address} (${hash})`);
  return result;
}

async function linkBytecode(item) {
  let object = item.bytecode.slice(2);
  for (const libraries of Object.values(item.linkReferences ?? {})) {
    for (const [name, references] of Object.entries(libraries)) {
      const library = await deploy(name, [], `library:${name}`);
      for (const reference of references) {
        const start = reference.start * 2;
        const length = reference.length * 2;
        object = `${object.slice(0, start)}${library.address.slice(2).toLowerCase()}${object.slice(start + length)}`;
      }
    }
  }
  if (object.includes("__$")) throw new Error("Contract bytecode contains unresolved Solidity library links.");
  return `0x${object}`;
}

async function sendCall(address, abi, functionName, functionArgs = [], signer = wallet) {
  const savedHash = checkpoint.transactions[functionName];
  if (savedHash) {
    const receipt = await publicClient.getTransactionReceipt({ hash: savedHash });
    if (receipt.status === "success") return savedHash;
    throw new Error(`Saved ${functionName} transaction did not succeed; inspect ${checkpointPath}.`);
  }
  const data = encodeFunctionData({ abi, functionName, args: functionArgs });
  const gas = await estimate({ to: address, data });
  const hash = await signer.writeContract({ address, abi, functionName, args: functionArgs, gas });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
  if (receipt.status !== "success") throw new Error(`${functionName} failed: ${hash}`);
  checkpoint.transactions[functionName] = hash;
  saveCheckpoint();
  console.log(`${functionName} confirmed: ${hash}`);
  return hash;
}

const withdrawalVerifier = await deploy("WithdrawalVerifier");
const commitmentVerifier = await deploy("CommitmentVerifier");
const entrypointImplementation = await deploy("Entrypoint");
const entrypointArtifact = artifact("Entrypoint");
const initializeData = encodeFunctionData({
  abi: entrypointArtifact.abi,
  functionName: "initialize",
  args: [account.address, postmanAccount.address],
});
const proxy = await deploy("ERC1967Proxy", [entrypointImplementation.address, initializeData], "entrypointProxy");
const pool = await deploy("ArtemisMainnetPrivacyPoolSimple", [
  proxy.address,
  withdrawalVerifier.address,
  commitmentVerifier.address,
  guardianAddress,
]);

const rootTx = await sendCall(proxy.address, entrypointArtifact.abi, "updateRoot", [BigInt(aspRoot), aspCid], postmanWallet);
const nativeAsset = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const registerTx = await sendCall(proxy.address, entrypointArtifact.abi, "registerPool", [nativeAsset, pool.address, parseEther("0.001"), 0n, 0n]);
const ownerRole = keccak256(new TextEncoder().encode("OWNER_ROLE"));
const renounceTx = await sendCall(proxy.address, entrypointArtifact.abi, "renounceRole", [ownerRole, account.address]);

const poolAbi = expectedPoolArtifact.abi;
const [paused, activationPending, guardian, poolScope, latestRoot, ownerStillHeld, postmanRoleHeld, associationSet] = await Promise.all([
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "depositsPaused" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "activationPending" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "guardian" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "SCOPE" }),
  publicClient.readContract({ address: proxy.address, abi: entrypointArtifact.abi, functionName: "latestRoot" }),
  publicClient.readContract({ address: proxy.address, abi: entrypointArtifact.abi, functionName: "hasRole", args: [ownerRole, account.address] }),
  publicClient.readContract({ address: proxy.address, abi: entrypointArtifact.abi, functionName: "hasRole", args: [keccak256(new TextEncoder().encode("ASP_POSTMAN")), postmanAccount.address] }),
  publicClient.readContract({ address: proxy.address, abi: entrypointArtifact.abi, functionName: "associationSets", args: [0n] }),
]);
const [denomination, lifetimeCap, poolEntrypoint, poolWithdrawalVerifier, poolRagequitVerifier, poolAsset, assetConfig, scopedPool] = await Promise.all([
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "DEPOSIT_DENOMINATION" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "LIFETIME_DEPOSIT_CAP" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "ENTRYPOINT" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "WITHDRAWAL_VERIFIER" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "RAGEQUIT_VERIFIER" }),
  publicClient.readContract({ address: pool.address, abi: poolAbi, functionName: "ASSET" }),
  publicClient.readContract({ address: proxy.address, abi: entrypointArtifact.abi, functionName: "assetConfig", args: [nativeAsset] }),
  publicClient.readContract({ address: proxy.address, abi: entrypointArtifact.abi, functionName: "scopeToPool", args: [poolScope] }),
]);
const [registeredPool, minimumDepositAmount, vettingFeeBPS, maxRelayFeeBPS] = assetConfig;
verifyMainnetDeploymentState({
  depositsPaused: paused,
  activationPending,
  guardian,
  expectedGuardian: guardianAddress,
  latestRoot,
  expectedRoot: aspRoot,
  associationSetCid: associationSet[1],
  expectedAssociationSetCid: aspCid,
  ownerStillHeld,
  postmanRoleHeld,
  denomination,
  lifetimeCap,
  entrypoint: poolEntrypoint,
  expectedEntrypoint: proxy.address,
  withdrawalVerifier: poolWithdrawalVerifier,
  expectedWithdrawalVerifier: withdrawalVerifier.address,
  ragequitVerifier: poolRagequitVerifier,
  expectedRagequitVerifier: commitmentVerifier.address,
  asset: poolAsset,
  nativeAsset,
  registeredPool,
  expectedPool: pool.address,
  minimumDepositAmount,
  vettingFeeBPS,
  maxRelayFeeBPS,
  scopedPool,
});

const manifest = {
  schemaVersion: 1,
  status: "mainnet",
  chainId: 4663,
  protocol: "0xbow-privacy-pools-core-v1.2.1",
  upstreamCoreCommit: "a80836a47451e662f127af17e11430ffa976c234",
  compiler: "solc 0.8.28",
  denominationWei: parseEther("0.001").toString(),
  lifetimeDepositCapWei: parseEther("10").toString(),
  protocolFeeBps: 0,
  relayFeeBps: 0,
  deployer: account.address,
  aspPostman: postmanAccount.address,
  guardian: guardianAddress,
  associationSet: { root: aspRoot, cid: aspCid },
  contracts: {
    withdrawalVerifier,
    commitmentVerifier,
    entrypointImplementation,
    entrypointProxy: proxy,
    pool,
    libraries: collectMainnetLibraries(checkpoint.contracts),
  },
  transactions: { rootTx, registerTx, renounceOwnerRoleTx: renounceTx },
  poolActivation: { depositsPaused: true, activationPending: true, activationTx: null },
  poolScope: String(poolScope),
  publishedAt: new Date().toISOString(),
  privacyClaim: "Mainnet deployment begins paused. No privacy or anonymity guarantee is implied; activation is a separate owner-controlled action.",
};
manifest.poolDeploymentBlock = pool.blockNumber;
manifest.entrypointDeploymentBlock = proxy.blockNumber;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
rmSync(checkpointPath, { force: true });
console.log(`Wrote mainnet deployment manifest: ${manifestPath}`);
