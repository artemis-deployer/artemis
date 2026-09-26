// Deploys ShieldedPool (+ mock verifier on testnet) and updates the manifest.
// Usage (testnet rehearsal):
//   PRIVATE_KEY=0x... node scripts/deploy-shielded.mjs
// Usage (mainnet, real verifier only — mock is REFUSED):
//   PRIVATE_KEY=0x... node scripts/deploy-shielded.mjs --mainnet --verifier 0x... --guardian 0x...
// Owner decision 2026-09-26: no third-party audit. Mainnet therefore deploys
// ONLY behind explicit flags and is labeled rehearsal-grade in the manifest.
import { createPublicClient, createWalletClient, http, defineChain, parseEther, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const TESTNET = {
  id: 46630,
  name: "Robinhood Chain Testnet",
  rpc: "https://robinhood-sepolia-rpc.publicnode.com",
  manifest: "../deployments/robinhood-testnet.json",
};
const MAINNET = {
  id: 4663,
  name: "Robinhood Chain",
  rpc: "https://robinhood-rpc.publicnode.com",
  manifest: "../deployments/robinhood-mainnet.json",
};

const isMainnet = process.argv.includes("--mainnet");
const NET = isMainnet ? MAINNET : TESTNET;
const DENOMINATION = parseEther("0.1");
const POOL_CAP = parseEther("10");

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? "" : (process.argv[i + 1] ?? "").trim();
}

const key = (process.env.PRIVATE_KEY ?? "").trim();
if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
  console.error("Set PRIVATE_KEY=0x... (drill wallet, never commit it).");
  process.exit(1);
}

let verifier = arg("--verifier");
if (!isMainnet) {
  if (verifier) {
    console.error("Testnet always deploys the mock verifier; drop --verifier.");
    process.exit(1);
  }
} else {
  if (!/^0x[0-9a-fA-F]{40}$/.test(verifier) || /^0x0+$/.test(verifier)) {
    console.error("Mainnet requires --verifier <audited verifier address>. Mock is refused on mainnet.");
    process.exit(1);
  }
}

const guardian = arg("--guardian");
const ts = readFileSync(new URL("../lib/shielded-artifact.ts", import.meta.url), "utf8");
function readConst(name) {
  const m = ts.match(new RegExp(`${name} = "(0x[0-9a-fA-F]+)"`));
  if (!m) {
    console.error(`Could not read ${name} from lib/shielded-artifact.ts`);
    process.exit(1);
  }
  return m[1];
}
function readAbi(name) {
  const m = ts.match(new RegExp(`export const ${name} = (\\[.*?\\]) as const;`, "s"));
  if (!m) {
    console.error(`Could not read ${name} from lib/shielded-artifact.ts`);
    process.exit(1);
  }
  return JSON.parse(m[1]);
}

const chain = defineChain({
  id: NET.id,
  name: NET.name,
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: { default: { http: [NET.rpc] } },
});
const account = privateKeyToAccount(key);
const wallet = createWalletClient({ account, chain, transport: http(NET.rpc) });
const pub = createPublicClient({ chain, transport: http(NET.rpc) });

const onchainId = await pub.getChainId();
if (onchainId !== NET.id) {
  console.error(`RPC chain id ${onchainId} != expected ${NET.id}; aborting.`);
  process.exit(1);
}

async function deploy(abi, bytecode, args, label) {
  console.log(`Deploying ${label}...`);
  const hash = await wallet.deployContract({ abi, bytecode, args });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`${label}:`, receipt.contractAddress, `(tx ${hash})`);
  return { address: receipt.contractAddress, txHash: hash };
}

let verifierAddr = verifier;
let verifierTx = "";
if (!isMainnet) {
  const r = await deploy(readAbi("SHIELDED_MOCK_ABI"), readConst("SHIELDED_MOCK_BYTECODE"), [], "ShieldedVerifierMock (TESTNET ONLY)");
  verifierAddr = r.address;
  verifierTx = r.txHash;
}

const poolAbi = readAbi("SHIELDED_ABI");
const poolBytecode = readConst("SHIELDED_BYTECODE");
const guardianAddr = guardian || account.address;
const pool = await deploy(
  poolAbi,
  poolBytecode,
  [verifierAddr, DENOMINATION, POOL_CAP, zeroHash, guardianAddr],
  "ShieldedPool",
);

// Merge into the manifest (ZK LAYER group).
const manifestUrl = new URL(NET.manifest, import.meta.url);
const manifest = JSON.parse(readFileSync(manifestUrl, "utf8"));
manifest.deployedAt = new Date().toISOString();
manifest.deployer = account.address;
manifest.gitCommit = manifest.gitCommit === "pre-manifest" ? manifest.gitCommit : manifest.gitCommit;
const entries = [
  {
    group: "ZK LAYER",
    name: "ShieldedPool",
    address: pool.address,
    txHash: pool.txHash,
    verified: false,
    owner: "none",
    notes: isMainnet
      ? "Rehearsal-grade: no third-party audit per owner decision 2026-09-26. Deposit caps enforced onchain."
      : "Testnet rehearsal with mock verifier (proves nothing). Verify sources on the testnet explorer next.",
  },
];
if (verifierTx) {
  entries.push({
    group: "ZK LAYER",
    name: "ShieldedVerifierMock",
    address: verifierAddr,
    txHash: verifierTx,
    verified: false,
    owner: "none",
    notes: "TESTNET ONLY mock: accepts any non-empty proof. Never deploy to mainnet.",
  });
}
const kept = (manifest.contracts ?? []).filter((c) => !entries.some((e) => e.name === c.name));
manifest.contracts = [...kept, ...entries];
delete manifest.notes;
writeFileSync(manifestUrl, JSON.stringify(manifest, null, 2) + "\n");
console.log(`manifest updated: ${NET.manifest}`);
console.log("Next: verify sources on the explorer, then run node scripts/make-post.mjs");
