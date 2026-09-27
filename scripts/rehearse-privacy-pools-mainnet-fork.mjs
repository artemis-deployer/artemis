import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  createPublicClient,
  defineChain,
  formatEther,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { assertSafeMainnetRpc } from "./shield-mainnet-rpc-policy.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
if (!args.includes("--i-understand-local-fork")) {
  throw new Error("Pass --i-understand-local-fork; this rehearsal executes the deployment only on your local fork.");
}
const rpcArgIndex = args.indexOf("--rpc");
if (rpcArgIndex === -1 || !args[rpcArgIndex + 1]) {
  throw new Error("Pass --rpc http://127.0.0.1:<port> for a running Robinhood Chain Anvil fork.");
}
const forkRpcUrl = assertSafeMainnetRpc(args[rpcArgIndex + 1], true);
const localChain = defineChain({
  id: 4663,
  name: "Robinhood Chain local fork",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [forkRpcUrl] } },
});
const localClient = createPublicClient({ chain: localChain, transport: http(forkRpcUrl) });
if (await localClient.getChainId() !== 4663) throw new Error("Local fork must expose chain ID 4663.");

function readEnvFile(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, (_, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted);
    result[match[1]] = value;
  }
  return result;
}

const config = readEnvFile(join(root, ".env.local"));
const mainnetRpcUrl = assertSafeMainnetRpc(
  config.SHIELD_MAINNET_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",
  false,
);
const mainnetChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [mainnetRpcUrl] } },
});
const mainnetClient = createPublicClient({ chain: mainnetChain, transport: http(mainnetRpcUrl, { timeout: 20_000 }) });
if (await mainnetClient.getChainId() !== 4663) throw new Error("Configured Robinhood RPC did not report chain ID 4663.");

// Public Foundry development key; it is deliberately independent of every project wallet key.
const testOnlyKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const testAccount = privateKeyToAccount(testOnlyKey);
const manifestName = `fork-sim-${Date.now()}-${process.pid}.json`;
const manifestPath = resolve(root, "deployments", manifestName);
const checkpointPath = manifestPath.replace(/\.json$/i, ".pending.json");
if (!manifestPath.startsWith(`${resolve(root, "deployments")}/`) && !manifestPath.startsWith(`${resolve(root, "deployments")}\\`)) {
  throw new Error("Refusing to write a fork simulation manifest outside deployments/.");
}

const childEnv = {
  PATH: process.env.PATH,
  SystemRoot: process.env.SystemRoot,
  SHIELD_MAINNET_RPC_URL: forkRpcUrl,
  SHIELD_OPERATOR_ADDRESS: testAccount.address,
  SHIELD_MAINNET_GUARDIAN_ADDRESS: testAccount.address,
  SHIELD_MAINNET_ASP_ROOT: config.SHIELD_MAINNET_ASP_ROOT || "",
  SHIELD_MAINNET_ASP_CID: config.SHIELD_MAINNET_ASP_CID || "",
  SHIELD_IPFS_GATEWAY: config.SHIELD_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs",
  SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY: testOnlyKey,
  SHIELD_MAINNET_POSTMAN_PRIVATE_KEY: testOnlyKey,
  SHIELD_MAINNET_RELAYER_PRIVATE_KEY: testOnlyKey,
  SHIELD_MAINNET_VERIFIER_READY: "true",
  SHIELD_MAINNET_BROADCAST_ENABLED: "true",
  SHIELD_MAINNET_DEPLOYMENT_MANIFEST: manifestName,
};

const deployment = spawnSync(process.execPath, [
  join(root, "scripts/deploy-privacy-pools-mainnet.mjs"),
  "--mainnet",
  "--broadcast",
  "--local-fork-simulation",
  "--i-understand-mainnet-broadcast",
], { cwd: root, env: childEnv, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
try {
  if (deployment.error) throw deployment.error;
  if (deployment.status !== 0) {
    const detail = `${deployment.stdout || ""}\n${deployment.stderr || ""}`.trim();
    const diagnostic = detail.match(/Details: ([^\r\n]+)/)?.[1]
      ?? detail.match(/shortMessage: '([^']+)'/)?.[1]
      ?? detail.split(/\r?\n/, 1)[0]
      ?? "no diagnostic was returned";
    throw new Error(`Fork deployment failed (exit ${deployment.status}): ${diagnostic}`);
  }
  if (!existsSync(manifestPath)) throw new Error("Fork deployment finished without its verification manifest.");

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const transactionHashes = new Set();
  const visit = (value, parentKey = "") => {
    if (!value || typeof value !== "object") {
      if (typeof value === "string" && /^0x[\da-f]{64}$/i.test(value) && (parentKey === "transactionHash" || parentKey === "transactions")) {
        transactionHashes.add(value);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === "transactionHash" && typeof child === "string") transactionHashes.add(child);
      else visit(child, parentKey === "transactions" ? "transactions" : key);
    }
  };
  visit(manifest);
  const receipts = await Promise.all([...transactionHashes].map((hash) => localClient.getTransactionReceipt({ hash })));
  if (!receipts.length || receipts.some((receipt) => receipt.status !== "success")) {
    throw new Error("Fork deployment has missing or failed transaction receipts.");
  }
  const totalGasUsed = receipts.reduce((total, receipt) => total + receipt.gasUsed, 0n);
  const [gasPriceBefore, gasPriceAfter, walletBalance] = await Promise.all([
    mainnetClient.getGasPrice(),
    mainnetClient.getGasPrice(),
    mainnetClient.getBalance({ address: (config.SHIELD_OPERATOR_ADDRESS || "0x0000000000000000000000000000000000000000") }),
  ]);
  const sampledGasPrice = gasPriceBefore > gasPriceAfter ? gasPriceBefore : gasPriceAfter;
  const budgetWith20PercentBuffer = totalGasUsed * sampledGasPrice * 120n / 100n;
  console.log(JSON.stringify({
    result: "local_fork_deployment_and_postdeployment_checks_passed",
    chainId: 4663,
    transactions: receipts.length,
    totalGasUsed: totalGasUsed.toString(),
    sampledMainnetGasPriceWei: sampledGasPrice.toString(),
    projectedBudgetWith20PercentBufferEth: formatEther(budgetWith20PercentBuffer),
    configuredWalletBalanceEth: formatEther(walletBalance),
    estimatedBalanceAfterDeploymentEth: formatEther(walletBalance > budgetWith20PercentBuffer ? walletBalance - budgetWith20PercentBuffer : 0n),
    sufficientAtSampledGasPrice: walletBalance >= budgetWith20PercentBuffer,
    poolStartsPaused: manifest.poolActivation?.depositsPaused === true,
    activationTransactionSent: manifest.poolActivation?.activationTx !== null,
    localForkManifestRemovedAfterChecks: true,
  }, null, 2));
} catch (error) {
  const detail = String(error?.stack || error).replaceAll(mainnetRpcUrl, "[redacted mainnet RPC]");
  console.error(detail);
  process.exitCode = 1;
} finally {
  rmSync(manifestPath, { force: true });
  rmSync(checkpointPath, { force: true });
}
