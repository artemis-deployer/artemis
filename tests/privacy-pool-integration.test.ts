import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const artifacts = (name: string) => JSON.parse(
  readFileSync(new URL(`../artifacts/shielded/0xbow-v1.2.1/${name}.json`, import.meta.url), "utf8"),
) as { abi: { type: string; name?: string; inputs?: { name?: string; type?: string }[] }[]; bytecode: string };

describe("pinned privacy pool build", () => {
  it("contains the expected real verifier public-signal layouts", () => {
    const withdraw = artifacts("WithdrawalVerifier");
    const commitment = artifacts("CommitmentVerifier");
    expect(withdraw.abi.find((entry) => entry.name === "verifyProof")?.inputs?.[3].type).toBe("uint256[8]");
    expect(commitment.abi.find((entry) => entry.name === "verifyProof")?.inputs?.[3].type).toBe("uint256[4]");
    expect(withdraw.bytecode.length).toBeGreaterThan(1000);
    expect(commitment.bytecode.length).toBeGreaterThan(1000);
  });

  it("enforces the rehearsal denomination, lifetime cap, and irreversible deposit pause", () => {
    const pool = artifacts("PrivacyPoolSimple");
    const names = pool.abi.map((entry) => entry.name);
    expect(names).toContain("deposit");
    expect(names).toContain("withdraw");
    expect(names).toContain("ragequit");
    expect(names).toContain("pauseDeposits");
    expect(names).toContain("renounceGuardian");
    expect(names).not.toContain("unpauseDeposits");
    expect(names).toContain("DEPOSIT_DENOMINATION");
    expect(names).toContain("LIFETIME_DEPOSIT_CAP");
  });

  it("builds the mainnet pool paused with a one-time guardian activation hook", () => {
    const pool = artifacts("ArtemisMainnetPrivacyPoolSimple");
    const names = pool.abi.map((entry) => entry.name);
    expect(names).toContain("depositsPaused");
    expect(names).toContain("activationPending");
    expect(names).toContain("activateDeposits");
    expect(names).not.toContain("unpauseDeposits");
    expect(pool.bytecode.length).toBeGreaterThan(1000);
  });

  it("pins every deployable mainnet artifact and validates the final on-chain configuration", () => {
    const deployScript = readFileSync(new URL("../scripts/deploy-privacy-pools-mainnet.mjs", import.meta.url), "utf8");
    expect(deployScript).toContain("verifyMainnetDeploymentArtifacts");
    expect(deployScript).toContain("verifyMainnetWalletIdentity");
    expect(deployScript).toContain("verifyMainnetDeploymentState");
    expect(deployScript).toContain("collectMainnetLibraries");
  });

  it("keeps the mock-backed legacy deploy command disabled", () => {
    const deployScript = readFileSync(new URL("../scripts/deploy-shielded.mjs", import.meta.url), "utf8");
    expect(deployScript).toContain("intentionally non-deployable");
    expect(deployScript).toContain("process.exit(1)");
  });

  it("supports a single funded testnet operator for the default roles", () => {
    const deployScript = readFileSync(new URL("../scripts/deploy-privacy-pools-testnet.mjs", import.meta.url), "utf8");
    expect(deployScript).toContain("process.env.SHIELD_ASP_POSTMAN_PRIVATE_KEY || key");
    expect(deployScript).toContain("process.env.SHIELD_RELAYER_PRIVATE_KEY || key");
    expect(deployScript).toContain("process.env.SHIELD_GUARDIAN_ADDRESS || account.address");
    expect(deployScript).toContain("id: 46630");
  });
});
