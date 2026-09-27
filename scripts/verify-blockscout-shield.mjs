// Submits Blockscout source verification (standard-json) for the deployed
// mainnet shield contracts. Read-only except the verification requests.
// Usage: node scripts/verify-blockscout-shield.mjs [--submit]
// Without --submit, only reports current verification status.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const EXPLORER = "https://robinhoodchain.blockscout.com";
const manifest = JSON.parse(readFileSync(join(root, "deployments/robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json"), "utf8"));

const SOURCES = [
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/Entrypoint.sol",
  "node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/implementations/PrivacyPoolSimple.sol",
  "contracts/ArtemisMainnetPrivacyPoolSimple.sol",
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers/WithdrawalVerifier.sol",
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers/CommitmentVerifier.sol",
];
const REMAPPINGS = [
  "contracts/=vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/",
  "interfaces/=vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/",
  "@oz/=node_modules/@openzeppelin/contracts/",
  "@oz-upgradeable/=node_modules/@openzeppelin/contracts-upgradeable/",
  "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/",
  "lean-imt/=node_modules/@zk-kit/lean-imt.sol/",
  "poseidon-solidity/=node_modules/poseidon-solidity/",
  "poseidon/=node_modules/poseidon-solidity/",
];
// Source units keyed EXACTLY as the compiler saw them (from artifact metadata),
// so the rebuilt metadata hash matches the deployed bytecode.
const ARTIFACT_FILES = [
  "ArtemisMainnetPrivacyPoolSimple",
  "Entrypoint",
  "ERC1967Proxy",
  "WithdrawalVerifier",
  "CommitmentVerifier",
  "PoseidonT3",
  "PoseidonT4",
];

function collectSources() {
  const names = new Set();
  for (const n of ARTIFACT_FILES) {
    const artifact = JSON.parse(readFileSync(join(root, `artifacts/shielded/0xbow-v1.2.1/${n}.json`), "utf8"));
    for (const key of Object.keys(JSON.parse(artifact.metadata).sources)) names.add(key);
  }
  const sources = {};
  for (const key of names) {
    sources[key] = { content: readFileSync(join(root, key), "utf8") };
  }
  return sources;
}

async function api(path, options) {
  const r = await fetch(`${EXPLORER}${path}`, options);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

const TARGETS = [
  { key: ["contracts", "pool", "address"], artifact: "ArtemisMainnetPrivacyPoolSimple", source: "contracts/ArtemisMainnetPrivacyPoolSimple.sol" },
  { key: ["contracts", "entrypointImplementation", "address"], artifact: "Entrypoint", source: "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/Entrypoint.sol" },
  { key: ["contracts", "entrypointProxy", "address"], artifact: "ERC1967Proxy", source: "node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol" },
  { key: ["contracts", "withdrawalVerifier", "address"], artifact: "WithdrawalVerifier", source: "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers/WithdrawalVerifier.sol" },
  { key: ["contracts", "commitmentVerifier", "address"], artifact: "CommitmentVerifier", source: "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers/CommitmentVerifier.sol" },
  { key: ["contracts", "libraries", "PoseidonT3", "address"], artifact: "PoseidonT3", source: "node_modules/poseidon-solidity/PoseidonT3.sol" },
  { key: ["contracts", "libraries", "PoseidonT4", "address"], artifact: "PoseidonT4", source: "node_modules/poseidon-solidity/PoseidonT4.sol" },
];

const results = [];
for (const t of TARGETS) {
  const address = t.key.reduce((o, k) => o?.[k], manifest);
  let status = "unknown";
  try {
    const info = await api(`/api/v2/smart-contracts/${address}`);
    status = info.is_verified ? "verified" : info.is_partially_verified ? "partial" : "unverified";
  } catch {
    status = "unverified";
  }
  results.push({ name: t.artifact, address, status });
}
console.log(JSON.stringify(results, null, 2));

const sources = collectSources();
const input = {
  language: "Solidity",
  sources,
  settings: { remappings: REMAPPINGS, optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi"] } } },
};
// Always persist the exact verification payloads: programmatic submission is
// behind bot protection, so a human pastes these into the Blockscout UI
// (Verify & Publish -> Via Standard JSON input) per contract.
mkdirSync(join(root, "deployments", "verification"), { recursive: true });
const libs = {
  "node_modules/poseidon-solidity/PoseidonT3.sol:PoseidonT3": manifest.contracts.libraries.PoseidonT3.address,
  "node_modules/poseidon-solidity/PoseidonT4.sol:PoseidonT4": manifest.contracts.libraries.PoseidonT4.address,
};
for (const t of TARGETS) {
  const payload = {
    compiler_version: "v0.8.28+commit.7893614a",
    optimization: "Yes, with 200 runs",
    contract_name: `${t.source}:${t.artifact}`,
    ...(t.artifact === "ArtemisMainnetPrivacyPoolSimple" ? { libraries: libs } : {}),
    standard_json_input: input,
  };
  writeFileSync(join(root, "deployments", "verification", `${t.artifact}.json`), JSON.stringify(payload, null, 2) + "\n");
}
console.log("Wrote deployments/verification/*.json (paste into Blockscout UI).");

if (!process.argv.includes("--submit")) {
  console.log("Dry check only. Re-run with --submit to attempt programmatic filing (likely bot-blocked).");
  process.exit(0);
}
for (const t of results.filter((r) => r.status !== "verified")) {
  const body = {
    compiler_version: "v0.8.28+commit.7893614a",
    standard_json_input: JSON.stringify(input),
    contract_name: `${t.source}:${t.artifact}`,
    ...(t.artifact === "ArtemisMainnetPrivacyPoolSimple" ? { libraries: libs } : {}),
  };
  const res = await api(`/api/v2/smart-contracts/${t.address}/verification/via/standard-json-input`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  console.log(t.artifact, "->", JSON.stringify(res).slice(0, 300));
}
