import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveMainnetDeploymentMode } from "../scripts/shield-mainnet-deployment-policy.mjs";

const base = {
  args: ["--mainnet"],
  env: {},
  chainId: 4663,
  verifierReady: true,
  configuredOperator: "0x1111111111111111111111111111111111111111",
  signerAddress: "0x1111111111111111111111111111111111111111",
};

describe("mainnet deployment mode policy", () => {
  it("defaults to a read-only dry-run", () => {
    expect(resolveMainnetDeploymentMode(base)).toEqual({ broadcast: false });
  });

  it("requires both command-line and environment broadcast acknowledgements", () => {
    expect(() => resolveMainnetDeploymentMode({ ...base, args: ["--mainnet", "--broadcast"] }))
      .toThrow("mainnet_broadcast_acknowledgement_required");
    expect(() => resolveMainnetDeploymentMode({
      ...base,
      args: ["--mainnet", "--broadcast", "--i-understand-mainnet-broadcast"],
    })).toThrow("mainnet_broadcast_env_opt_in_required");
    expect(() => resolveMainnetDeploymentMode({ ...base, args: ["--mainnet", "--dry-run", "--broadcast"] }))
      .toThrow("mainnet_mode_conflict");
  });

  it("blocks a broadcast when chain, verifier review, or one-wallet identity is wrong", () => {
    const args = ["--mainnet", "--broadcast", "--i-understand-mainnet-broadcast"];
    const env = { SHIELD_MAINNET_BROADCAST_ENABLED: "true" };
    expect(() => resolveMainnetDeploymentMode({ ...base, args, env, chainId: 46630 }))
      .toThrow("mainnet_chain_id_mismatch");
    expect(() => resolveMainnetDeploymentMode({ ...base, args, env, verifierReady: false }))
      .toThrow("mainnet_verifier_release_gate_closed");
    expect(() => resolveMainnetDeploymentMode({
      ...base,
      args,
      env,
      signerAddress: "0x2222222222222222222222222222222222222222",
    })).toThrow("mainnet_operator_signer_mismatch");
  });

  it("allows only a fully acknowledged mainnet broadcast mode", () => {
    expect(resolveMainnetDeploymentMode({
      ...base,
      args: ["--mainnet", "--broadcast", "--i-understand-mainnet-broadcast"],
      env: { SHIELD_MAINNET_BROADCAST_ENABLED: "true" },
    })).toEqual({ broadcast: true });
  });

  it("keeps the mainnet runner dry by default and never activates deposits during deployment", () => {
    const source = readFileSync(new URL("../scripts/deploy-privacy-pools-mainnet.mjs", import.meta.url), "utf8");
    expect(source.indexOf("const mode = resolveMainnetDeploymentMode")).toBeLessThan(source.indexOf("const wallet = createWalletClient"));
    expect(source.indexOf("if (!mode.broadcast)")).toBeLessThan(source.indexOf("const wallet = createWalletClient"));
    expect(source).not.toContain('functionName: "activateDeposits"');
    expect(source).toContain("activationPending: true");
    expect(source).toContain('args.includes("--local-fork-simulation")');
    expect(source).toContain("assertSafeMainnetRpc(");
  });
});
