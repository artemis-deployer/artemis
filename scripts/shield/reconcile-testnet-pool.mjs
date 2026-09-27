import { readFileSync } from "node:fs";
import { createPublicClient, defineChain, http } from "viem";

const manifestName = (process.env.SHIELD_DEPLOYMENT_MANIFEST || "robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json").trim();
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("SHIELD_DEPLOYMENT_MANIFEST must be a safe JSON filename.");
const manifest = JSON.parse(readFileSync(`deployments/${manifestName}`, "utf8"));
if (manifest.chainId !== 46630 || manifest.status !== "testnet-rehearsal") throw new Error("Only the Robinhood testnet rehearsal is supported.");

const rpcUrl = process.env.SHIELD_RPC_URL || "https://robinhood-sepolia-rpc.publicnode.com";
const chain = defineChain({
  id: 46630,
  name: "Robinhood Chain Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});
const client = createPublicClient({ chain, transport: http(rpcUrl, { timeout: 30_000, retryCount: 3, retryDelay: 1_000 }) });
if (await client.getChainId() !== chain.id) throw new Error("RPC chain ID mismatch.");
const pool = manifest.contracts.pool.address;
const poolAbi = JSON.parse(readFileSync("artifacts/shielded/0xbow-v1.2.1/PrivacyPoolSimple.json", "utf8")).abi;
const fromBlock = BigInt(manifest.poolDeploymentBlock);
const toBlock = await client.getBlockNumber();
const deposits = [];
const withdrawals = [];
for (let start = fromBlock; start <= toBlock; start += 1800n) {
  const end = start + 1799n < toBlock ? start + 1799n : toBlock;
  const [depositChunk, withdrawalChunk] = await Promise.all([
    client.getContractEvents({ address: pool, abi: poolAbi, eventName: "Deposited", fromBlock: start, toBlock: end, strict: true }),
    client.getContractEvents({ address: pool, abi: poolAbi, eventName: "Withdrawn", fromBlock: start, toBlock: end, strict: true }),
  ]);
  deposits.push(...depositChunk);
  withdrawals.push(...withdrawalChunk);
}
const [balance, lifetimeDeposited, depositCap] = await Promise.all([
  client.getBalance({ address: pool }),
  client.readContract({ address: pool, abi: poolAbi, functionName: "lifetimeDeposited" }),
  client.readContract({ address: pool, abi: poolAbi, functionName: "LIFETIME_DEPOSIT_CAP" }),
]);
const totalDeposited = deposits.reduce((sum, event) => sum + event.args._value, 0n);
const totalWithdrawn = withdrawals.reduce((sum, event) => sum + event.args._value, 0n);
const invariantHolds = totalDeposited - totalWithdrawn === balance;
if (!invariantHolds || totalDeposited !== lifetimeDeposited || lifetimeDeposited > depositCap) {
  throw new Error("Onchain pool accounting invariant failed.");
}
console.log(JSON.stringify({
  status: "passed",
  mode: "read-only event scan in 1800-block chunks",
  chainId: chain.id,
  scannedFromBlock: fromBlock.toString(),
  scannedToBlock: toBlock.toString(),
  depositEvents: deposits.length,
  withdrawalEvents: withdrawals.length,
  totalDepositedWei: totalDeposited.toString(),
  totalWithdrawnWei: totalWithdrawn.toString(),
  poolBalanceWei: balance.toString(),
  lifetimeDepositedWei: lifetimeDeposited.toString(),
  depositCapWei: depositCap.toString(),
  depositMinusWithdrawalInvariant: invariantHolds,
  transactionBroadcast: false,
}, null, 2));
