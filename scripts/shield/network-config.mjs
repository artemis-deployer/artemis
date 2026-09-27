const NETWORKS = {
  4663: {
    id: 4663,
    name: "Robinhood Chain",
    status: "mainnet",
    defaultRpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    defaultManifestName: "robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json",
    envPrefix: "SHIELD_MAINNET",
  },
  46630: {
    id: 46630,
    name: "Robinhood Chain Testnet",
    status: "testnet-rehearsal",
    defaultRpcUrl: "https://robinhood-sepolia-rpc.publicnode.com",
    defaultManifestName: "robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json",
    envPrefix: "SHIELD_TESTNET",
  },
};

export function resolveShieldScriptNetwork(env = process.env) {
  const id = Number(env.SHIELD_CHAIN_ID || 46630);
  const network = NETWORKS[id];
  if (!network) throw new Error("unsupported_chain");
  return {
    ...network,
    rpcUrl: env[`${network.envPrefix}_RPC_URL`] || (network.id === 46630 ? env.SHIELD_RPC_URL : "") || network.defaultRpcUrl,
    manifestName: env[`${network.envPrefix}_DEPLOYMENT_MANIFEST`] || env.SHIELD_DEPLOYMENT_MANIFEST || network.defaultManifestName,
  };
}

export function assertShieldScriptManifest(manifest, network) {
  if (manifest?.chainId !== network.id || manifest?.status !== network.status) {
    throw new Error("deployment_manifest_network_mismatch");
  }
}
