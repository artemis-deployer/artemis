import { describe, expect, it } from "vitest";
import { shieldNetworkForChainId, shieldNetworkFromManifest } from "../lib/shield-networks";

describe("Shield network registry", () => {
  it("resolves only the explicitly supported Robinhood chain IDs", () => {
    expect(shieldNetworkForChainId("4663")).toMatchObject({ id: 4663, name: "Robinhood Chain", deploymentStatus: "mainnet" });
    expect(shieldNetworkForChainId(46630)).toMatchObject({ id: 46630, name: "Robinhood Chain Testnet", deploymentStatus: "testnet-rehearsal" });
    expect(shieldNetworkForChainId("1")).toBeNull();
    expect(shieldNetworkForChainId(undefined)).toBeNull();
  });

  it("accepts a manifest only when its chain and deployment status match", () => {
    expect(shieldNetworkFromManifest({ chainId: 4663, status: "mainnet" })?.id).toBe(4663);
    expect(shieldNetworkFromManifest({ chainId: 46630, status: "testnet-rehearsal" })?.id).toBe(46630);
    expect(shieldNetworkFromManifest({ chainId: 4663, status: "testnet-rehearsal" })).toBeNull();
    expect(shieldNetworkFromManifest({ chainId: 46630, status: "mainnet" })).toBeNull();
  });
});
