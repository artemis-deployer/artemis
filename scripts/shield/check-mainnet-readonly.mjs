import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, defineChain, http } from "viem";

const rpcArgumentIndex = process.argv.indexOf("--rpc-url");
const rpcUrl = (rpcArgumentIndex >= 0 ? process.argv[rpcArgumentIndex + 1] : process.env.SHIELD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com").trim();
if (!/^https:\/\//i.test(rpcUrl)) throw new Error("Mainnet RPC URL must use HTTPS.");
const manifestName = (process.env.SHIELD_MAINNET_DEPLOYMENT_MANIFEST || "robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json").trim();
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("Invalid mainnet manifest filename.");
const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 15_000, retryCount: 2 }) });
const [chainId, blockNumber] = await Promise.all([client.getChainId(), client.getBlockNumber()]);
if (chainId !== 4663) throw new Error(`Mainnet RPC chain ID mismatch: expected 4663, received ${chainId}.`);

const manifestPath = join(process.cwd(), "deployments", manifestName);
let deployment = { configured: false, reason: "mainnet_manifest_missing" };
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const contracts = Object.values(manifest.contracts ?? {}).flatMap((value) =>
    value && typeof value === "object" && "address" in value ? [value.address] : [],
  );
  const codeResults = await Promise.all(contracts.map(async (address) => ({ address, code: await client.getCode({ address }) })));
  deployment = {
    configured: manifest.chainId === 4663 && manifest.status === "mainnet" && codeResults.length > 0 && codeResults.every(({ code }) => Boolean(code && code !== "0x")),
    reason: "manifest_and_code_checked",
    manifestChainId: manifest.chainId,
    manifestStatus: manifest.status,
    contractsChecked: codeResults.length,
    contractsWithCode: codeResults.filter(({ code }) => Boolean(code && code !== "0x")).length,
  };
}

console.log(JSON.stringify({
  network: chain.name,
  chainId,
  observedHead: blockNumber.toString(),
  deployment,
  featureFlags: { enabled: false, depositEnabled: false, withdrawEnabled: false },
  transactionsSent: 0,
}, null, 2));
