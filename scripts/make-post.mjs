import { readFileSync, writeFileSync } from "node:fs";

const root = (p) => new URL(p, import.meta.url);
const load = (p) => JSON.parse(readFileSync(root(p), "utf8"));

function shortHost(explorer) {
  return explorer.replace(/^https?:\/\//, "");
}

function contractLines(manifest) {
  if (manifest.contracts.length === 0) return "_(none deployed yet)_";
  return manifest.contracts
    .map((c) => `${c.name}\n${shortHost(manifest.explorer)}/address/${c.address}`)
    .join("\n\n");
}

function externalLines(manifest) {
  if (manifest.external.length === 0) return "_(none)_";
  return manifest.external
    .map((c) => `${c.name}\n${shortHost(manifest.explorer)}/address/${c.address}`)
    .join("\n\n");
}

function testnetPost(m) {
  return `ArtemisZK is now live on Robinhood Chain Testnet.

Chain ID: ${m.chainId}

CORE
${contractLines(m)}

EXTERNAL
${externalLines(m)}

All Artemis contracts are verified. No owner roles, no mint functions.
Rehearse your launch for free before mainnet.
`;
}

function mainnetPost(m) {
  return `ArtemisZK is live on Robinhood Chain Mainnet.

Chain ID: ${m.chainId}
Deploy block: ${m.deployBlock}
Commit: ${m.gitCommit}

CORE INFRASTRUCTURE
${contractLines(m)}

EXTERNAL DEPENDENCIES
${externalLines(m)}

Every Artemis contract is verified and publicly auditable.
Full list: artemiszk.tech/contracts
`;
}

for (const [file, fn] of [
  ["../deployments/robinhood-testnet.json", testnetPost],
  ["../deployments/robinhood-mainnet.json", mainnetPost],
]) {
  const manifest = load(file);
  const out = file.replace(/\.json$/, ".post.md");
  writeFileSync(root(out), fn(manifest));
  console.log(`wrote ${out}`);
}
