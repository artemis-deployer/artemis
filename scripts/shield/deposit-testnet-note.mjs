// Deposit-only testnet helper: creates a fresh recovery phrase, saves an
// encrypted backup (password = deployer key, the established rehearsal
// convention), then deposits one 0.001 ETH note. Withdrawal is left to the
// owner via UI backup import + relayer.
// Usage: node --env-file=.env.local [--import tsx] scripts/shield/deposit-testnet-note.mjs --confirm-testnet-transfer --allow-new-deposit
// Requires a TS runner (tsx) because it imports lib/shielded-client.ts.
// Prints tx hash + backup path only. Never prints keys or phrases.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, createWalletClient, defineChain, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SHIELDED_ENTRYPOINT_ABI, SHIELDED_POOL_READ_ABI } from "../../lib/shielded-contract-abis.ts";
import {
  createShieldAccount,
  createShieldRecoveryPhrase,
  encryptShieldBackup,
} from "../../lib/shielded-client.ts";
import {
  resolveShieldRehearsalBackupPath,
  writeShieldRehearsalBackupOnce,
} from "./rehearsal-backup.mjs";

if (!process.argv.includes("--confirm-testnet-transfer") || !process.argv.includes("--allow-new-deposit")) {
  throw new Error("Pass --confirm-testnet-transfer --allow-new-deposit to send a real 0.001 ETH testnet deposit.");
}

const root = process.cwd();
const manifestName = (process.env.SHIELD_DEPLOYMENT_MANIFEST || "robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json").trim();
const manifest = JSON.parse(readFileSync(join(root, "deployments", manifestName), "utf8"));
if (manifest.chainId !== 46630) throw new Error("Refusing: manifest is not Robinhood testnet (46630).");
if (manifest.denominationWei !== "1000000000000000") throw new Error("Refusing: unexpected denomination.");
const poolAddress = manifest.contracts?.pool?.address;
const entrypoint = manifest.contracts?.entrypointProxy?.address;
if (!poolAddress || !entrypoint) throw new Error("Pool manifest is incomplete.");

const rpcUrl = (process.env.SHIELD_RPC_URL || "https://robinhood-sepolia-rpc.publicnode.com").trim();
const key = (process.env.SHIELD_DEPLOYER_PRIVATE_KEY || "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("SHIELD_DEPLOYER_PRIVATE_KEY missing or malformed.");

const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 30_000 }) });
const wallet = createWalletClient({ account, chain, transport: http(rpcUrl, { timeout: 30_000 }) });
if (await pub.getChainId() !== 46630) throw new Error("RPC did not report testnet chain ID 46630.");

const pool = {
  chainId: 46630,
  address: poolAddress,
  scope: await pub.readContract({ address: poolAddress, abi: SHIELDED_POOL_READ_ABI, functionName: "SCOPE" }),
  deploymentBlock: BigInt(manifest.poolDeploymentBlock),
};
const paused = await pub.readContract({ address: poolAddress, abi: parseAbi(["function depositsPaused() view returns (bool)"]), functionName: "depositsPaused" });
if (paused) throw new Error("Pool deposits are paused; aborting.");

const phrase = createShieldRecoveryPhrase();
const created = createShieldAccount(phrase, pool, rpcUrl);
const secrets = created.accountService.createDepositSecrets(pool.scope);
const backupPath = resolveShieldRehearsalBackupPath({ projectDirectory: root });
const encrypted = await encryptShieldBackup(phrase, key);
writeShieldRehearsalBackupOnce(backupPath, `${JSON.stringify(encrypted, null, 2)}\n`);

const hash = await wallet.writeContract({
  address: entrypoint,
  abi: SHIELDED_ENTRYPOINT_ABI,
  functionName: "deposit",
  args: [secrets.precommitment],
  value: BigInt(manifest.denominationWei),
});
console.log(JSON.stringify({ depositTx: hash, backupPath, denominationEth: "0.001" }));
const receipt = await pub.waitForTransactionReceipt({ hash, confirmations: 13, timeout: 300_000 });
if (receipt.status !== "success") throw new Error(`Deposit failed: ${hash}`);
console.log(JSON.stringify({ confirmed: true, blockNumber: receipt.blockNumber.toString() }));
console.log("Import the backup in the Shield UI (password = deployer key), then withdraw via relayer.");
