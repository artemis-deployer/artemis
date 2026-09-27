import { createPublicClient, defineChain, formatEther, http, isAddress } from "viem";
import { createShieldMainnetDeploymentPlan } from "../../lib/shield-mainnet-plan.mjs";

const args = process.argv.slice(2);
if (!args.includes("--mainnet") || !args.includes("--dry-run")) {
  throw new Error("This command is preflight-only. Pass --mainnet --dry-run; it has no transaction signing or broadcast path.");
}

const rpcArgumentIndex = args.indexOf("--rpc-url");
const rpcUrl = (rpcArgumentIndex >= 0 ? args[rpcArgumentIndex + 1] : process.env.SHIELD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com").trim();
if (!/^https:\/\//i.test(rpcUrl)) throw new Error("Mainnet RPC URL must use HTTPS.");
const operatorAddress = (process.env.SHIELD_OPERATOR_ADDRESS || "").trim();
const guardianAddress = (process.env.SHIELD_MAINNET_GUARDIAN_ADDRESS || operatorAddress).trim();
const aspRoot = (process.env.SHIELD_MAINNET_ASP_ROOT || "").trim();
const aspCid = (process.env.SHIELD_MAINNET_ASP_CID || "").trim();
const genesisSentinel = "21888242871839275222246405745257275088548364400416034343698204186575808495616";
if (!isAddress(operatorAddress)) throw new Error("Set SHIELD_OPERATOR_ADDRESS to the public address for the single mainnet operator wallet.");
if (!aspRoot || !aspCid) throw new Error("Set SHIELD_MAINNET_ASP_ROOT and SHIELD_MAINNET_ASP_CID after publishing and verifying a mainnet genesis association set.");

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }) });
const [chainId, blockNumber, balance] = await Promise.all([
  client.getChainId(),
  client.getBlockNumber(),
  client.getBalance({ address: operatorAddress }),
]);
if (chainId !== 4663) throw new Error(`Mainnet RPC chain ID mismatch: expected 4663, received ${chainId}.`);

const gateway = (process.env.SHIELD_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");
const response = await fetch(`${gateway}/${encodeURIComponent(aspCid)}`, {
  cache: "no-store",
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok) throw new Error("Mainnet genesis association dataset is not available from the configured IPFS gateway.");
const dataset = await response.json();
if (
  dataset.chainId !== 4663 || dataset.protocol !== "0xbow-privacy-pools-core-v1.2.1" ||
  String(dataset.root) !== aspRoot || String(dataset.snapshotBlock) !== "0" ||
  !Array.isArray(dataset.labels) || dataset.labels.length !== 1 || String(dataset.labels[0]) !== genesisSentinel ||
  aspRoot !== genesisSentinel
) {
  throw new Error("Mainnet genesis association dataset must be the verified single-sentinel dataset for chain 4663.");
}

const plan = createShieldMainnetDeploymentPlan({ operatorAddress, guardianAddress, aspRoot, aspCid });
console.log(JSON.stringify({
  ...plan,
  preflight: {
    rpcChainId: chainId,
    observedHead: blockNumber.toString(),
    operatorBalanceEth: formatEther(balance),
    mainnetTransactionsSent: 0,
  },
}, null, 2));
