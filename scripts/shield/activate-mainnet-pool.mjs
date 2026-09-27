// One-time guardian activation for the mainnet shielded pool.
// Usage: node --env-file=.env.local scripts/shield/activate-mainnet-pool.mjs --mainnet --i-understand-activation
// Sends exactly one transaction: ArtemisMainnetPrivacyPoolSimple.activateDeposits().
// After this, deposits open (pause can still be triggered once, irreversibly).
// No funds move. Requires SHIELD_MAINNET_* env (keys never printed).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { assertSafeMainnetRpc } from "../shield-mainnet-rpc-policy.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
if (!args.includes("--mainnet") || !args.includes("--i-understand-activation")) {
  throw new Error("Pass --mainnet --i-understand-activation; this sends a real guardian transaction.");
}

const rpcUrl = assertSafeMainnetRpc(process.env.SHIELD_MAINNET_RPC_URL || "", false);
const key = (process.env.SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY || "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("SHIELD_MAINNET_DEPLOYER_PRIVATE_KEY missing or malformed.");
const manifestName = (process.env.SHIELD_MAINNET_DEPLOYMENT_MANIFEST || "").trim();
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("SHIELD_MAINNET_DEPLOYMENT_MANIFEST missing or invalid.");
const manifest = JSON.parse(readFileSync(join(root, "deployments", manifestName), "utf8"));
const pool = manifest.contracts?.pool?.address;
if (!/^0x[0-9a-fA-F]{40}$/.test(pool || "")) throw new Error("Pool address missing from mainnet manifest.");

const chain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 30_000, retryCount: 2 }) });
const wallet = createWalletClient({ account, chain, transport: http(rpcUrl, { timeout: 30_000, retryCount: 0 }) });

if (await pub.getChainId() !== 4663) throw new Error("RPC did not report chain ID 4663; aborting.");
const artifact = JSON.parse(readFileSync(join(root, "artifacts/shielded/0xbow-v1.2.1/ArtemisMainnetPrivacyPoolSimple.json"), "utf8"));
const guardian = await pub.readContract({ address: pool, abi: artifact.abi, functionName: "guardian" });
if (guardian.toLowerCase() !== account.address.toLowerCase()) {
  throw new Error("Signer is not the pool guardian; aborting.");
}
const pending = await pub.readContract({ address: pool, abi: artifact.abi, functionName: "activationPending" });
if (!pending) throw new Error("Pool already activated; nothing to do.");

const hash = await wallet.writeContract({ address: pool, abi: artifact.abi, functionName: "activateDeposits" });
console.log(`activateDeposits sent: ${hash}`);
const receipt = await pub.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 180_000 });
if (receipt.status !== "success") throw new Error(`Activation failed: ${hash}`);
const [paused, stillPending] = await Promise.all([
  pub.readContract({ address: pool, abi: artifact.abi, functionName: "depositsPaused" }),
  pub.readContract({ address: pool, abi: artifact.abi, functionName: "activationPending" }),
]);
console.log(JSON.stringify({ activationTx: hash, depositsPaused: paused, activationPending: stillPending }));
if (paused || stillPending) throw new Error("Activation did not take effect; inspect pool state.");
console.log("Pool deposits are now OPEN. Emergency pause remains available once (irreversible).");
