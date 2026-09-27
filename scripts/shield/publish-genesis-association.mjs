import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateMerkleProof } from "@0xbow/privacy-pools-core-sdk";
import { resolveShieldScriptNetwork } from "./network-config.mjs";

const mainnetRequested = process.argv.includes("--mainnet");
const network = resolveShieldScriptNetwork({
  ...process.env,
  ...(mainnetRequested ? { SHIELD_CHAIN_ID: "4663" } : {}),
});
if (network.id === 4663 && !mainnetRequested) throw new Error("Pass --mainnet to publish a chain-specific mainnet genesis set.");

const token = (process.env.PINATA_JWT ?? "").trim();
if (!token) throw new Error("Set PINATA_JWT to pin the public genesis ASP dataset.");
const sentinel = 21888242871839275222246405745257275088548364400416034343698204186575808495616n;
const labels = [sentinel];
const proof = generateMerkleProof(labels, sentinel);
const dataset = {
  schemaVersion: 1,
  protocol: "0xbow-privacy-pools-core-v1.2.1",
  chainId: network.id,
  policy: "Genesis sentinel only; withdrawals stay unavailable until the postman publishes confirmed pool labels.",
  snapshotBlock: "0",
  labels: labels.map(String),
  root: String(proof.root),
};
const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ pinataContent: dataset, pinataMetadata: { name: `artemis-shield-genesis-${network.id}-v1` } }),
});
if (!response.ok) throw new Error(`Pinata failed (${response.status}); dataset was not published.`);
const result = await response.json();
if (typeof result.IpfsHash !== "string") throw new Error("Pinata did not return an immutable CID.");
if (!/^(bafy[a-z2-7]{20,59}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/.test(result.IpfsHash)) throw new Error("Pinata returned a malformed IPFS CID.");
const gateway = (process.env.SHIELD_IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs").replace(/\/$/, "");
let published;
for (let attempt = 0; attempt < 5; attempt += 1) {
  try {
    const fetched = await fetch(`${gateway}/${encodeURIComponent(result.IpfsHash)}`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (fetched.ok) published = await fetched.json();
  } catch {}
  if (published) break;
  await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
}
if (!published || published.root !== dataset.root || JSON.stringify(published.labels) !== JSON.stringify(dataset.labels)) {
  throw new Error("Pinned genesis dataset could not be fetched and verified.");
}
const rootPath = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const envPath = join(rootPath, ".env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  const values = network.id === 4663
    ? { SHIELD_MAINNET_ASP_ROOT: dataset.root, SHIELD_MAINNET_ASP_CID: result.IpfsHash }
    : { SHIELD_ASP_ROOT: dataset.root, SHIELD_ASP_CID: result.IpfsHash };
  for (const [name, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => line.startsWith(`${name}=`));
    if (index >= 0) lines[index] = `${name}=${value}`;
    else lines.push(`${name}=${value}`);
  }
  writeFileSync(envPath, `${lines.join("\n").replace(/\n*$/, "\n")}`, "utf8");
}
console.log(JSON.stringify({ root: dataset.root, cid: result.IpfsHash, labels: dataset.labels.length }, null, 2));
