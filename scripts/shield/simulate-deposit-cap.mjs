import { readFileSync } from "node:fs";
import { createPublicClient, decodeErrorResult, defineChain, encodeFunctionData, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { lifetimeDepositCapOverride, simulatedFundedSenderOverride } from "./pool-state-overrides.mjs";

if (!process.argv.includes("--read-only-simulation")) {
  throw new Error("Pass --read-only-simulation to run the cap check using eth_call state overrides; no transaction is broadcast.");
}

const manifestName = (process.env.SHIELD_DEPLOYMENT_MANIFEST || "robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json").trim();
if (!/^[a-z0-9][a-z0-9.-]*\.json$/i.test(manifestName)) throw new Error("SHIELD_DEPLOYMENT_MANIFEST must be a safe JSON filename.");
const manifest = JSON.parse(readFileSync(`deployments/${manifestName}`, "utf8"));
if (manifest.chainId !== 46630 || manifest.status !== "testnet-rehearsal") throw new Error("Only the Robinhood testnet rehearsal is supported.");
const key = (process.env.SHIELD_DEPLOYER_PRIVATE_KEY || "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) throw new Error("Set SHIELD_DEPLOYER_PRIVATE_KEY in .env.local.");
const account = privateKeyToAccount(key);
const poolAbi = JSON.parse(readFileSync("artifacts/shielded/0xbow-v1.2.1/PrivacyPoolSimple.json", "utf8")).abi;
const entrypointAbi = JSON.parse(readFileSync("artifacts/shielded/0xbow-v1.2.1/Entrypoint.json", "utf8")).abi;
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
const entrypoint = manifest.contracts.entrypointProxy.address;
const [cap, denomination, lifetimeDeposited, balanceBefore] = await Promise.all([
  client.readContract({ address: pool, abi: poolAbi, functionName: "LIFETIME_DEPOSIT_CAP" }),
  client.readContract({ address: pool, abi: poolAbi, functionName: "DEPOSIT_DENOMINATION" }),
  client.readContract({ address: pool, abi: poolAbi, functionName: "lifetimeDeposited" }),
  client.getBalance({ address: pool }),
]);
if (lifetimeDeposited >= cap || denomination !== BigInt(manifest.denominationWei)) {
  throw new Error("On-chain cap or denomination does not match the active rehearsal manifest.");
}

const data = encodeFunctionData({ abi: entrypointAbi, functionName: "deposit", args: [1n] });
let revertData;
try {
  await client.call({
    account: account.address,
    to: entrypoint,
    data,
    value: denomination,
    gas: 5_000_000n,
    gasPrice: 0n,
    stateOverride: [
      simulatedFundedSenderOverride(account.address, 100n * 10n ** 18n),
      lifetimeDepositCapOverride(pool, cap),
    ],
  });
} catch (error) {
  revertData = error?.data || error?.cause?.data || error?.cause?.cause?.data;
}
if (!revertData) throw new Error("Read-only deposit call did not revert; cap guard was not proven.");
let decoded;
try {
  decoded = decodeErrorResult({ abi: poolAbi, data: revertData });
} catch {
  throw new Error("Read-only deposit call reverted for a reason other than a decoded pool error.");
}
if (decoded.errorName !== "PoolDepositCapExceeded") {
  throw new Error(`Expected PoolDepositCapExceeded, received ${decoded.errorName}.`);
}

const [lifetimeAfter, balanceAfter] = await Promise.all([
  client.readContract({ address: pool, abi: poolAbi, functionName: "lifetimeDeposited" }),
  client.getBalance({ address: pool }),
]);
if (lifetimeAfter !== lifetimeDeposited || balanceAfter !== balanceBefore) {
  throw new Error("Read-only state override unexpectedly changed on-chain state.");
}
console.log(JSON.stringify({
  status: "passed",
  mode: "eth_call with ephemeral state overrides",
  chainId: chain.id,
  capWei: cap.toString(),
  simulatedLifetimeDepositedWei: cap.toString(),
  attemptedDepositWei: denomination.toString(),
  revert: decoded.errorName,
  transactionBroadcast: false,
  persistentStateUnchanged: true,
}, null, 2));
