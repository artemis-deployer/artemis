export interface ShieldNetwork {
  id: 4663 | 46630;
  name: string;
  deploymentStatus: "mainnet" | "testnet-rehearsal";
  defaultRpcUrl: string;
  defaultManifest: string;
}

const NETWORKS: readonly ShieldNetwork[] = [
  {
    id: 4663,
    name: "Robinhood Chain",
    deploymentStatus: "mainnet",
    defaultRpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    defaultManifest: "robinhood-mainnet-privacy-pools-v1.2.1-0.001eth.json",
  },
  {
    id: 46630,
    name: "Robinhood Chain Testnet",
    deploymentStatus: "testnet-rehearsal",
    defaultRpcUrl: "https://robinhood-sepolia-rpc.publicnode.com",
    defaultManifest: "robinhood-testnet-privacy-pools-v1.2.1-0.001eth.json",
  },
];

export function shieldNetworkForChainId(chainId: string | number | undefined): ShieldNetwork | null {
  const id = typeof chainId === "number" ? chainId : Number(chainId);
  if (!Number.isSafeInteger(id)) return null;
  return NETWORKS.find((network) => network.id === id) ?? null;
}

export function shieldNetworkFromManifest(manifest: unknown): ShieldNetwork | null {
  if (!manifest || typeof manifest !== "object") return null;
  const candidate = manifest as { chainId?: unknown; status?: unknown };
  const network = shieldNetworkForChainId(typeof candidate.chainId === "number" ? candidate.chainId : undefined);
  return network?.deploymentStatus === candidate.status ? network : null;
}
