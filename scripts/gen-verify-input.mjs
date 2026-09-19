import { readFileSync, writeFileSync } from "node:fs";
const root = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const stdInput = {
  language: "Solidity",
  sources: {
    "ArtemisToken.sol": { content: root("../contracts/ArtemisToken.sol") },
    "ArtemisLauncher.sol": { content: root("../contracts/ArtemisLauncher.sol") },
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "evm.methodIdentifiers", "metadata"] },
    },
  },
};
writeFileSync(
  new URL("../blockscout-verify-input.json", import.meta.url),
  JSON.stringify(stdInput),
);
console.log("wrote blockscout-verify-input.json");
