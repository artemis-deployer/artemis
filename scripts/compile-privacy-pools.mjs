import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sources = [
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/Entrypoint.sol",
  "node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/implementations/PrivacyPoolSimple.sol",
  "contracts/ArtemisMainnetPrivacyPoolSimple.sol",
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers/WithdrawalVerifier.sol",
  "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers/CommitmentVerifier.sol",
];
const remappings = [
  "contracts/=vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/",
  "interfaces/=vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/interfaces/",
  "@oz/=node_modules/@openzeppelin/contracts/",
  "@oz-upgradeable/=node_modules/@openzeppelin/contracts-upgradeable/",
  "@openzeppelin/contracts/=node_modules/@openzeppelin/contracts/",
  "lean-imt/=node_modules/@zk-kit/lean-imt.sol/",
  "poseidon-solidity/=node_modules/poseidon-solidity/",
  "poseidon/=node_modules/poseidon-solidity/",
];
const input = {
  language: "Solidity",
  sources: Object.fromEntries(sources.map((path) => [path, { content: readFileSync(join(root, path), "utf8") }])),
  settings: {
    remappings,
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.bytecode.linkReferences", "metadata"] } },
  },
};
const output = JSON.parse(solc.compile(JSON.stringify(input), {
  import(path) {
    const sourcePath = path.replaceAll("\\", "/");
    const remapping = remappings.find((item) => sourcePath.startsWith(item.split("=")[0]));
    const resolved = remapping
      ? join(root, remapping.split("=")[1], sourcePath.slice(remapping.split("=")[0].length))
      : join(root, sourcePath);
    try {
      return { contents: readFileSync(resolved, "utf8") };
    } catch {
      return { error: `Unable to resolve Solidity import: ${path}` };
    }
  },
}));
const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
if (errors.length) {
  console.error(errors.map((entry) => entry.formattedMessage).join("\n"));
  process.exit(1);
}
const outDir = join(root, "artifacts/shielded/0xbow-v1.2.1");
mkdirSync(outDir, { recursive: true });
for (const [sourceName, contracts] of Object.entries(output.contracts ?? {})) {
  for (const [contractName, artifact] of Object.entries(contracts)) {
    if (!artifact.evm.bytecode.object) continue;
    const outputName = sourceName.endsWith("/WithdrawalVerifier.sol")
      ? "WithdrawalVerifier"
      : sourceName.endsWith("/CommitmentVerifier.sol")
        ? "CommitmentVerifier"
        : contractName;
    const path = join(outDir, `${outputName}.json`);
    writeFileSync(path, JSON.stringify({
      contractName,
      outputName,
      sourceName,
      abi: artifact.abi,
      bytecode: `0x${artifact.evm.bytecode.object}`,
      linkReferences: artifact.evm.bytecode.linkReferences,
      metadata: artifact.metadata,
    }, null, 2) + "\n");
  }
}
console.log(`Compiled pinned privacy pool contracts with solc ${solc.version()} into ${outDir}`);
