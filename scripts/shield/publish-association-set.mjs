import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generateMerkleProof } from "@0xbow/privacy-pools-core-sdk";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  keccak256,
  toBytes,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { assertShieldScriptManifest, resolveShieldScriptNetwork } from "./network-config.mjs";

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const mainnetRequested = process.argv.includes("--mainnet");
const network = resolveShieldScriptNetwork({
  ...process.env,
  ...(mainnetRequested ? { SHIELD_CHAIN_ID: "4663" } : {}),
});
if (network.id === 4663 && !mainnetRequested) throw new Error("Pass --mainnet to publish an association set to Robinhood mainnet.");
const manifestName = network.manifestName.trim();
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("SHIELD_DEPLOYMENT_MANIFEST must be a safe JSON filename.");
const manifestPath = join(root, "deployments", manifestName);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
assertShieldScriptManifest(manifest, network);
const operatorKey = network.id === 4663 ? process.env.SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY : process.env.SHIELD_DEPLOYER_PRIVATE_KEY;
const postmanKey = network.id === 4663 ? process.env.SHIELD_MAINNET_POSTMAN_PRIVATE_KEY : process.env.SHIELD_ASP_POSTMAN_PRIVATE_KEY;
const key = (postmanKey || operatorKey || "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set the ASP postman key or the single-wallet SHIELD_DEPLOYER_PRIVATE_KEY.");
const pinata = (process.env.PINATA_JWT ?? "").trim();
if (!pinata) throw new Error("Set PINATA_JWT to publish the immutable public ASP dataset.");
const rpcUrl = network.rpcUrl;
const chain = defineChain({
  id: network.id,
  name: network.name,
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const account = privateKeyToAccount(key);
const transport = http(rpcUrl, { timeout: 30_000, retryCount: 5, retryDelay: 1_000 });
const publicClient = createPublicClient({ chain, transport });
const wallet = createWalletClient({ account, chain, transport });
if (await publicClient.getChainId() !== chain.id) throw new Error("RPC chain ID mismatch.");

const artifactsDir = join(root, "artifacts/shielded/0xbow-v1.2.1");
const poolAbi = JSON.parse(readFileSync(join(artifactsDir, "PrivacyPoolSimple.json"), "utf8")).abi;
const entrypointAbi = JSON.parse(readFileSync(join(artifactsDir, "Entrypoint.json"), "utf8")).abi;
const postmanRole = keccak256(toBytes("ASP_POSTMAN"));
const isPostman = await publicClient.readContract({
  address: manifest.contracts.entrypointProxy.address,
  abi: entrypointAbi,
  functionName: "hasRole",
  args: [postmanRole, account.address],
});
if (!isPostman) throw new Error("Configured signer does not have the ASP_POSTMAN role.");

const confirmations = Math.max(12, Number(process.env.SHIELD_CONFIRMATIONS || 12));
const head = await publicClient.getBlockNumber();
if (head <= BigInt(confirmations)) throw new Error("Chain head is not deep enough to select a finalized snapshot.");
const snapshotBlock = head - BigInt(confirmations);
const before = await publicClient.getBlock({ blockNumber: snapshotBlock });
const firstBlock = BigInt(manifest.poolDeploymentBlock);
if (firstBlock > snapshotBlock) throw new Error("No finalized blocks exist after the pool deployment block yet.");
const chunkSize = 40000n;
const depositLogs = [];
for (let fromBlock = firstBlock; fromBlock <= snapshotBlock; fromBlock += chunkSize) {
  const toBlock = fromBlock + chunkSize - 1n < snapshotBlock ? fromBlock + chunkSize - 1n : snapshotBlock;
  const logs = await publicClient.getContractEvents({
    address: manifest.contracts.pool.address,
    abi: poolAbi,
    eventName: "Deposited",
    fromBlock,
    toBlock,
    strict: true,
  });
  depositLogs.push(...logs);
}
const after = await publicClient.getBlock({ blockNumber: snapshotBlock });
if (before.hash !== after.hash) throw new Error("Finalized snapshot changed during scan; retry the association-set build.");

const field = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const labels = depositLogs
  .map((log) => BigInt(log.args._label))
  .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
if (new Set(labels.map(String)).size !== labels.length) throw new Error("Duplicate pool deposit label detected.");
const sentinel = field - 1n;
const datasetLabels = [...labels, ...(labels.includes(sentinel) ? [] : [sentinel])]
  .sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
const rootProof = generateMerkleProof(datasetLabels, datasetLabels[0]);
const aspRoot = BigInt(rootProof.root);
if (aspRoot <= 0n || aspRoot >= field) throw new Error("Computed ASP root is outside the SNARK scalar field.");

const dataset = {
  schemaVersion: 1,
  protocol: manifest.protocol,
  chainId: manifest.chainId,
  pool: manifest.contracts.pool.address,
  snapshotBlock: snapshotBlock.toString(),
  snapshotBlockHash: before.hash,
  policy: "All confirmed deposits are included; no compliance or sanction-screening claim is made.",
  sentinelLabel: sentinel.toString(),
  labels: datasetLabels.map(String),
  root: aspRoot.toString(),
};
const pinResponse = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
  method: "POST",
  headers: { Authorization: `Bearer ${pinata}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    pinataContent: dataset,
    pinataMetadata: { name: `artemis-shield-asp-${manifest.chainId}-${snapshotBlock}` },
  }),
});
if (!pinResponse.ok) throw new Error(`ASP dataset upload failed (${pinResponse.status}).`);
const pinned = await pinResponse.json();
const cid = pinned.IpfsHash;
if (typeof cid !== "string" || cid.length < 32 || cid.length > 64) throw new Error("Storage provider returned an invalid CID.");
if (!/^(bafy[a-z2-7]{20,59}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/.test(cid)) throw new Error("Storage provider returned a malformed IPFS CID.");
const gateway = (process.env.SHIELD_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");
let publishedDataset;
for (let attempt = 0; attempt < 5; attempt += 1) {
  try {
    const response = await fetch(`${gateway}/${encodeURIComponent(cid)}`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (response.ok) publishedDataset = await response.json();
  } catch {}
  if (publishedDataset) break;
  await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
}
if (
  !publishedDataset || publishedDataset.root !== dataset.root || publishedDataset.chainId !== dataset.chainId ||
  publishedDataset.pool.toLowerCase() !== dataset.pool.toLowerCase() ||
  JSON.stringify(publishedDataset.labels) !== JSON.stringify(dataset.labels)
) throw new Error("Published ASP dataset could not be fetched and verified; onchain root was not updated.");

const hash = await wallet.writeContract({
  address: manifest.contracts.entrypointProxy.address,
  abi: entrypointAbi,
  functionName: "updateRoot",
  args: [aspRoot, cid],
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error("Entrypoint rejected the ASP root update.");
const onchainRoot = await publicClient.readContract({
  address: manifest.contracts.entrypointProxy.address,
  abi: entrypointAbi,
  functionName: "latestRoot",
});
if (onchainRoot !== aspRoot) throw new Error("Published ASP root does not match the onchain root.");
manifest.associationSetHistory ??= [{ ...manifest.associationSet, transactionHash: manifest.transactions.rootTx }];
manifest.associationSetHistory.push({
  root: aspRoot.toString(),
  cid,
  snapshotBlock: snapshotBlock.toString(),
  snapshotBlockHash: before.hash,
  transactionHash: hash,
  publishedAt: new Date().toISOString(),
});
manifest.associationSet = { root: aspRoot.toString(), cid, snapshotBlock: snapshotBlock.toString(), snapshotBlockHash: before.hash };
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const envPath = join(root, ".env.local");
const envLines = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
const aspEnvValues = network.id === 4663
  ? { SHIELD_MAINNET_ASP_ROOT: aspRoot.toString(), SHIELD_MAINNET_ASP_CID: cid }
  : { SHIELD_ASP_ROOT: aspRoot.toString(), SHIELD_ASP_CID: cid };
for (const [name, value] of Object.entries(aspEnvValues)) {
  const index = envLines.findIndex((line) => line.startsWith(`${name}=`));
  if (index >= 0) envLines[index] = `${name}=${value}`;
  else envLines.push(`${name}=${value}`);
}
writeFileSync(envPath, `${envLines.join("\n").replace(/\n*$/, "\n")}`, "utf8");
console.log(JSON.stringify({ root: aspRoot.toString(), cid, snapshotBlock: snapshotBlock.toString(), depositCount: labels.length, transactionHash: hash }, null, 2));
