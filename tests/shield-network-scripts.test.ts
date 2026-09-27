import { describe, expect, it } from "vitest";
import { resolveShieldScriptNetwork, assertShieldScriptManifest } from "../scripts/shield/network-config.mjs";

describe("Shield operator script network selection", () => {
  const env = (values: Record<string, string>) => ({ NODE_ENV: "test", ...values }) as NodeJS.ProcessEnv;

  it("selects network-specific RPC and manifest without inheriting testnet values", () => {
    expect(resolveShieldScriptNetwork(env({ SHIELD_CHAIN_ID: "4663", SHIELD_RPC_URL: "https://testnet.invalid" }))).toMatchObject({
      id: 4663,
      status: "mainnet",
      rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
      manifestName: "robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json",
    });
    expect(resolveShieldScriptNetwork(env({ SHIELD_CHAIN_ID: "4663", SHIELD_MAINNET_RPC_URL: "https://main.invalid", SHIELD_MAINNET_DEPLOYMENT_MANIFEST: "main.json" }))).toMatchObject({
      rpcUrl: "https://main.invalid",
      manifestName: "main.json",
    });
  });

  it("rejects cross-chain manifests and unknown chain IDs", () => {
    const mainnet = resolveShieldScriptNetwork(env({ SHIELD_CHAIN_ID: "4663" }));
    expect(() => assertShieldScriptManifest({ chainId: 46630, status: "testnet-rehearsal" }, mainnet)).toThrow("deployment_manifest_network_mismatch");
    expect(() => resolveShieldScriptNetwork(env({ SHIELD_CHAIN_ID: "1" }))).toThrow("unsupported_chain");
  });
});
