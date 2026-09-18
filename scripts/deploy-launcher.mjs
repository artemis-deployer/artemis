// Deploys ArtemisLauncher to Hood mainnet (one-time, owner runs locally).
// Usage: PRIVATE_KEY=0x... node scripts/deploy-launcher.mjs --mainnet
// Prints the launcher address -> paste it into HOOD_MAINNET.launcher,
// then verify sources on Blockscout.
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync } from "node:fs";

const CHAIN_ID = 4663;
const ROUTER = "0x89e5db8b5aa49aa85ac63f691524311aeb649eba"; // must match HOOD_MAINNET.router in lib/launcher-evm.ts
const RPC = "https://robinhood-rpc.publicnode.com"; // must match HOOD_MAINNET.rpc in lib/launcher-evm.ts
const EXPLORER = "https://robinhoodchain.blockscout.com";

if (!process.argv.includes("--mainnet")) {
  console.error(`Refusing to deploy: re-run with --mainnet to confirm Hood mainnet (id ${CHAIN_ID}) deployment.`);
  process.exit(1);
}

if (!/^0x[0-9a-fA-F]{40}$/.test(ROUTER) || /^0x0+$/.test(ROUTER)) {
  console.error("Bad ROUTER constructor arg: not a non-zero EVM address.");
  process.exit(1);
}

const key = (process.env.PRIVATE_KEY ?? "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
  console.error("Set PRIVATE_KEY=0x... (drill wallet, never commit it).");
  process.exit(1);
}

// The artifact is a TS file; extract ABI + bytecode with plain regex (no toolchain).
const ts = readFileSync(new URL("../lib/launcher-artifact.ts", import.meta.url), "utf8");
const abi = JSON.parse(ts.slice(ts.indexOf("=") + 1, ts.lastIndexOf("as const")).trim());
const code = ts.match(/LAUNCHER_BYTECODE = "(0x[0-9a-fA-F]+)"/);
if (!code) {
  console.error("Could not read LAUNCHER_BYTECODE from lib/launcher-artifact.ts");
  process.exit(1);
}

const chain = defineChain({
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: [RPC] } },
});

const account = privateKeyToAccount(key);
const wallet = createWalletClient({ account, chain, transport: http(RPC) });
const pub = createPublicClient({ chain, transport: http(RPC) });

const onchainId = await pub.getChainId();
if (onchainId !== CHAIN_ID) {
  console.error(`RPC chain id ${onchainId} != expected ${CHAIN_ID}; aborting.`);
  process.exit(1);
}

console.log(`Deploying ArtemisLauncher to Hood mainnet (id ${CHAIN_ID})...`);
console.log("router:", ROUTER);
console.log("deployer:", account.address);
console.log("rpc:", RPC);

const hash = await wallet.deployContract({ abi, bytecode: code[1], args: [ROUTER] });
console.log("deploy tx:", hash);
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log("launcher:", receipt.contractAddress);
console.log(`verify: ${EXPLORER}/address/${receipt.contractAddress}`);
