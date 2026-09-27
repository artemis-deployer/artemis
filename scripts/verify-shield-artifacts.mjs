import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifactsDir = join(root, "public/shield-artifacts/v1.2.1");
const sourceDir = join(root, "vendor/0xbow-privacy-pools-core-v1.2.1/contracts-src/contracts/verifiers");
const pinsSource = readFileSync(join(root, "lib/shielded-artifact-integrity.ts"), "utf8");
const pins = Object.fromEntries([...pinsSource.matchAll(/"([\w.]+)": "([a-f\d]{64})"/gi)].map((match) => [match[1], match[2]]));
const snarkjs = join(root, "node_modules/snarkjs/cli.js");
const temporaryDir = mkdtempSync(join(tmpdir(), "artemis-shield-verify-"));
try {
  for (const name of ["commitment", "withdraw"]) {
    for (const extension of ["wasm", "vkey", "zkey"]) {
      const file = join(artifactsDir, `${name}.${extension}`);
      const digest = createHash("sha256").update(readFileSync(file)).digest("hex");
      if (digest !== pins[`${name}.${extension}`]) throw new Error(`Artifact checksum mismatch: ${name}.${extension}`);
    }
    const exportedVkey = join(temporaryDir, `${name}.vkey`);
    const generatedVerifier = join(temporaryDir, `${name}.sol`);
    execFileSync(process.execPath, [snarkjs, "zkey", "export", "verificationkey", join(artifactsDir, `${name}.zkey`), exportedVkey], { stdio: "ignore" });
    execFileSync(process.execPath, [snarkjs, "zkey", "export", "solidityverifier", join(artifactsDir, `${name}.zkey`), generatedVerifier], { stdio: "ignore" });
    if (JSON.stringify(JSON.parse(readFileSync(exportedVkey, "utf8"))) !== JSON.stringify(JSON.parse(readFileSync(join(artifactsDir, `${name}.vkey`), "utf8")))) {
      throw new Error(`Verification key does not match ${name}.zkey`);
    }
    const checkedInVerifier = join(sourceDir, name === "withdraw" ? "WithdrawalVerifier.sol" : "CommitmentVerifier.sol");
    if (readFileSync(generatedVerifier, "utf8") !== readFileSync(checkedInVerifier, "utf8")) {
      throw new Error(`Solidity verifier source is stale for ${name}.zkey`);
    }
  }
  console.log("All pinned circuit checksums, exported keys, and Solidity verifiers match.");
} finally {
  rmSync(temporaryDir, { recursive: true, force: true });
}
